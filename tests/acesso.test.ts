import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryKV } from '../api/_lib/kv'
import {
  ativarCodigo,
  criarCodigo,
  renovarSessao,
  revogarCodigo,
  verificarTokenAcesso,
} from '../api/_lib/acesso'

const SEGREDO = 'segredo-de-teste-bem-longo-o-suficiente'
const DIA = 86_400
const AGORA = 1_700_000_000 // fixo, para os testes serem determinísticos

let kv: MemoryKV

beforeEach(() => {
  kv = new MemoryKV()
})

describe('ativação', () => {
  it('recusa código inexistente', async () => {
    const r = await ativarCodigo(kv, SEGREDO, 'NAO-EXISTE', 'dev-1', AGORA)
    expect(r).toEqual({ ok: false, motivo: 'codigo_invalido' })
  })

  it('ativa um código novo e define o prazo a partir de agora', async () => {
    await criarCodigo(kv, 'COD1', 180)
    const r = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('unreachable')
    expect(r.sessao.expiraEm).toBe(AGORA + 180 * DIA)

    const payload = verificarTokenAcesso(r.sessao.tokenAcesso, SEGREDO, AGORA)
    expect(payload).toMatchObject({ codigo: 'COD1', deviceId: 'dev-1', tipo: 'acesso' })
  })

  it('recusa código revogado', async () => {
    await criarCodigo(kv, 'COD1', 180)
    await revogarCodigo(kv, 'COD1')
    const r = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    expect(r).toEqual({ ok: false, motivo: 'codigo_revogado' })
  })

  it('reativar no mesmo aparelho não mexe no prazo original', async () => {
    await criarCodigo(kv, 'COD1', 180)
    const primeira = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    if (!primeira.ok) throw new Error('unreachable')

    const segunda = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA + 10 * DIA)
    if (!segunda.ok) throw new Error('unreachable')
    expect(segunda.sessao.expiraEm).toBe(primeira.sessao.expiraEm)
  })

  it('ativar em outro aparelho transfere o código sem resetar o prazo', async () => {
    await criarCodigo(kv, 'COD1', 180)
    const primeira = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    if (!primeira.ok) throw new Error('unreachable')

    const transferida = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-2', AGORA + 5 * DIA)
    if (!transferida.ok) throw new Error('unreachable')
    // prazo não reseta: continua contado da primeira ativação
    expect(transferida.sessao.expiraEm).toBe(AGORA + 180 * DIA)
  })
})

describe('renovação', () => {
  async function ativarNovo(codigo: string, deviceId: string, duracaoDias = 180) {
    await criarCodigo(kv, codigo, duracaoDias)
    const r = await ativarCodigo(kv, SEGREDO, codigo, deviceId, AGORA)
    if (!r.ok) throw new Error('setup falhou')
    return r.sessao
  }

  it('renova com sucesso e devolve um novo token de acesso', async () => {
    const sessao = await ativarNovo('COD1', 'dev-1')
    const mais14min = AGORA + 14 * 60
    const r = await renovarSessao(kv, SEGREDO, sessao.tokenRenovacao, mais14min)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('unreachable')
    expect(r.sessao.tokenAcesso).not.toBe(sessao.tokenAcesso)

    const payload = verificarTokenAcesso(r.sessao.tokenAcesso, SEGREDO, mais14min)
    expect(payload?.deviceId).toBe('dev-1')
  })

  it('recusa renovação com token inválido', async () => {
    const r = await renovarSessao(kv, SEGREDO, 'token-invalido', AGORA)
    expect(r).toEqual({ ok: false, motivo: 'token_invalido' })
  })

  it('recusa renovação de um código revogado depois da ativação', async () => {
    const sessao = await ativarNovo('COD1', 'dev-1')
    await revogarCodigo(kv, 'COD1')
    const r = await renovarSessao(kv, SEGREDO, sessao.tokenRenovacao, AGORA + 60)
    expect(r).toEqual({ ok: false, motivo: 'codigo_revogado' })
  })

  it('recusa renovação vinda do aparelho antigo depois de transferência', async () => {
    const sessaoDev1 = await ativarNovo('COD1', 'dev-1')
    await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-2', AGORA + 60) // transfere para dev-2

    const r = await renovarSessao(kv, SEGREDO, sessaoDev1.tokenRenovacao, AGORA + 120)
    expect(r).toEqual({ ok: false, motivo: 'aparelho_diferente' })
  })

  it('recusa renovação depois do prazo expirar — o token de renovação já rejeita sozinho', async () => {
    // O `exp` do token de renovação é igual a `expiraEm` por construção (ver
    // api/_lib/acesso.ts emitirSessao) — então passado o prazo, a própria assinatura
    // já rejeita o token antes de qualquer consulta ao KV. 'token_invalido' aqui é o
    // comportamento correto, não uma falha do teste anterior a esta correção.
    const sessao = await ativarNovo('COD1', 'dev-1', 1) // 1 dia de prazo
    const depoisDoPrazo = AGORA + 2 * DIA
    const r = await renovarSessao(kv, SEGREDO, sessao.tokenRenovacao, depoisDoPrazo)
    expect(r).toEqual({ ok: false, motivo: 'token_invalido' })
  })

  it('recusa renovação com motivo "expirado" se o prazo no KV for reduzido depois do token emitido', async () => {
    // Defesa em profundidade: mesmo que o token de renovação ainda esteja
    // criptograficamente válido (exp no futuro), a checagem contra o KV pega um
    // `expiraEm` mais curto do que o token supõe — cenário real: um ajuste
    // administrativo direto no registro (ex.: encurtar o acesso de um aluno).
    const sessao = await ativarNovo('COD1', 'dev-1', 180)
    const registro = await kv.get<{ expiraEm: number }>('codigo:COD1')
    await kv.set('codigo:COD1', { ...(registro as object), expiraEm: AGORA + 10 })

    const r = await renovarSessao(kv, SEGREDO, sessao.tokenRenovacao, AGORA + 20)
    expect(r).toEqual({ ok: false, motivo: 'expirado' })
  })

  it('o token de acesso emitido nunca ultrapassa expiraEm, mesmo perto do fim do prazo', async () => {
    const sessao = await ativarNovo('COD1', 'dev-1', 1) // expira em 1 dia
    const faltam5min = sessao.expiraEm - 5 * 60
    const r = await renovarSessao(kv, SEGREDO, sessao.tokenRenovacao, faltam5min)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('unreachable')
    const payload = verificarTokenAcesso(r.sessao.tokenAcesso, SEGREDO, faltam5min)
    expect(payload!.exp).toBeLessThanOrEqual(sessao.expiraEm)
    expect(payload!.exp).toBe(sessao.expiraEm) // capado em expiraEm, não em +15min
  })
})

describe('verificação de token de acesso', () => {
  it('token de renovação não serve como token de acesso', async () => {
    await criarCodigo(kv, 'COD1', 180)
    const r = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    if (!r.ok) throw new Error('setup falhou')
    expect(verificarTokenAcesso(r.sessao.tokenRenovacao, SEGREDO, AGORA)).toBeNull()
  })

  it('token de acesso expira sozinho, sem precisar de renovação/KV', async () => {
    await criarCodigo(kv, 'COD1', 180)
    const r = await ativarCodigo(kv, SEGREDO, 'COD1', 'dev-1', AGORA)
    if (!r.ok) throw new Error('setup falhou')
    const passou16min = AGORA + 16 * 60
    expect(verificarTokenAcesso(r.sessao.tokenAcesso, SEGREDO, passou16min)).toBeNull()
  })
})
