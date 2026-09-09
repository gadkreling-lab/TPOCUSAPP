import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryKV } from '../api/_lib/kv'
import {
  ativarCodigo,
  criarCodigo,
  criarCodigos,
  estenderPrazo,
  listarCodigos,
  revogarCodigo,
  statusCodigo,
  type CodigoRecord,
} from '../api/_lib/acesso'
import { autenticarAdmin, compararSeguro } from '../api/_lib/adminAuth'

const SEGREDO = 'segredo-de-teste-bem-longo-o-suficiente'
const DIA = 86_400
const AGORA = 1_700_000_000

let kv: MemoryKV

beforeEach(() => {
  kv = new MemoryKV()
})

function registro(sobrepor: Partial<CodigoRecord> = {}): CodigoRecord {
  return {
    duracaoDias: 180,
    ativadoEm: null,
    expiraEm: null,
    deviceId: null,
    ultimaRenovacaoEm: null,
    revogado: false,
    ...sobrepor,
  }
}

describe('statusCodigo', () => {
  it('não ativado', () => {
    expect(statusCodigo(registro(), AGORA)).toBe('nao_ativado')
  })

  it('ativo — ativado, com prazo no futuro', () => {
    const r = registro({ ativadoEm: AGORA - DIA, expiraEm: AGORA + DIA })
    expect(statusCodigo(r, AGORA)).toBe('ativo')
  })

  it('expirado — prazo já passou', () => {
    const r = registro({ ativadoEm: AGORA - 200 * DIA, expiraEm: AGORA - DIA })
    expect(statusCodigo(r, AGORA)).toBe('expirado')
  })

  it('revogado tem prioridade sobre qualquer outro estado', () => {
    const ativoERevogado = registro({ ativadoEm: AGORA - DIA, expiraEm: AGORA + DIA, revogado: true })
    expect(statusCodigo(ativoERevogado, AGORA)).toBe('revogado')

    const naoAtivadoERevogado = registro({ revogado: true })
    expect(statusCodigo(naoAtivadoERevogado, AGORA)).toBe('revogado')
  })
})

describe('criarCodigos (lote)', () => {
  it('gera a quantidade pedida, todos únicos e recuperáveis', async () => {
    const codigos = await criarCodigos(kv, 20, 90)
    expect(codigos).toHaveLength(20)
    expect(new Set(codigos).size).toBe(20) // sem duplicata

    for (const codigo of codigos) {
      const r = await kv.get<CodigoRecord>(`codigo:${codigo}`)
      expect(r).toMatchObject({ duracaoDias: 90, ativadoEm: null, revogado: false })
    }
  })

  it('quantidade 1 funciona (caso trivial)', async () => {
    const codigos = await criarCodigos(kv, 1, 30)
    expect(codigos).toHaveLength(1)
  })
})

describe('listarCodigos', () => {
  it('lista vazia quando nada foi criado', async () => {
    expect(await listarCodigos(kv, AGORA)).toEqual([])
  })

  it('inclui status calculado e ordem mais-recente-primeiro', async () => {
    await criarCodigo(kv, 'COD1', 180)
    await criarCodigo(kv, 'COD2', 90)
    await ativarCodigo(kv, SEGREDO, 'COD2', 'dev-1', AGORA)

    const lista = await listarCodigos(kv, AGORA)
    expect(lista.map((c) => c.codigo)).toEqual(['COD2', 'COD1']) // mais recente primeiro
    expect(lista.find((c) => c.codigo === 'COD1')?.status).toBe('nao_ativado')
    expect(lista.find((c) => c.codigo === 'COD2')?.status).toBe('ativo')
  })

  it('reflete revogação', async () => {
    await criarCodigo(kv, 'COD1', 180)
    await revogarCodigo(kv, 'COD1')
    const lista = await listarCodigos(kv, AGORA)
    expect(lista[0].status).toBe('revogado')
  })
})

describe('estenderPrazo', () => {
  it('recusa código inexistente', async () => {
    const r = await estenderPrazo(kv, 'NAO-EXISTE', 30)
    expect(r).toEqual({ ok: false, motivo: 'codigo_invalido' })
  })

  it('recusa código ainda não ativado (sem expiraEm para estender)', async () => {
    await criarCodigo(kv, 'COD1', 180)
    const r = await estenderPrazo(kv, 'COD1', 30)
    expect(r).toEqual({ ok: false, motivo: 'nao_ativado' })
  })

  it('soma dias ao expiraEm ATUAL, não a partir de agora', async () => {
    await criarCodigo(kv, 'COD1', 180)
    await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    // expiraEm = AGORA + 180 dias
    const r = await estenderPrazo(kv, 'COD1', 30)
    expect(r).toEqual({ ok: true, novoExpiraEm: AGORA + 180 * DIA + 30 * DIA })
  })

  it('dias negativos reduzem o prazo (correção de um lote gerado errado)', async () => {
    await criarCodigo(kv, 'COD1', 180)
    await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    const r = await estenderPrazo(kv, 'COD1', -10)
    expect(r).toEqual({ ok: true, novoExpiraEm: AGORA + 170 * DIA })
  })
})

describe('compararSeguro', () => {
  it('true para strings iguais', () => {
    expect(compararSeguro('senha-123', 'senha-123')).toBe(true)
  })

  it('false para strings diferentes, mesmo comprimento', () => {
    expect(compararSeguro('senha-123', 'senha-456')).toBe(false)
  })

  it('false para strings de comprimentos diferentes, sem lançar', () => {
    expect(compararSeguro('curta', 'muito-mais-longa-que-a-primeira')).toBe(false)
  })

  it('false para string vazia', () => {
    expect(compararSeguro('', 'senha-123')).toBe(false)
  })
})

describe('autenticarAdmin', () => {
  // process.env.ADMIN_PASSWORD é restaurado em cada teste via try/finally — evita
  // acoplar mais um hook (afterEach) só para isso, e deixa explícito por teste.
  const ORIGINAL = process.env.ADMIN_PASSWORD

  it('aceita a senha correta no cabeçalho Bearer', () => {
    process.env.ADMIN_PASSWORD = 'senha-admin-bem-longa'
    try {
      const req = { headers: { authorization: 'Bearer senha-admin-bem-longa' } }
      expect(autenticarAdmin(req)).toBe(true)
    } finally {
      process.env.ADMIN_PASSWORD = ORIGINAL
    }
  })

  it('recusa senha incorreta', () => {
    process.env.ADMIN_PASSWORD = 'senha-admin-bem-longa'
    try {
      const req = { headers: { authorization: 'Bearer senha-errada' } }
      expect(autenticarAdmin(req)).toBe(false)
    } finally {
      process.env.ADMIN_PASSWORD = ORIGINAL
    }
  })

  it('recusa cabeçalho ausente', () => {
    process.env.ADMIN_PASSWORD = 'senha-admin-bem-longa'
    try {
      expect(autenticarAdmin({ headers: {} })).toBe(false)
    } finally {
      process.env.ADMIN_PASSWORD = ORIGINAL
    }
  })

  it('falha fechada quando ADMIN_PASSWORD não está configurada no ambiente', () => {
    delete process.env.ADMIN_PASSWORD
    try {
      const req = { headers: { authorization: 'Bearer qualquer-coisa' } }
      expect(autenticarAdmin(req)).toBe(false)
    } finally {
      process.env.ADMIN_PASSWORD = ORIGINAL
    }
  })
})
