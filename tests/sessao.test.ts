import { describe, expect, it } from 'vitest'
import {
  novaSessao,
  comEntrada,
  semEntrada,
  comTitulo,
  entradaCalculadora,
  entradaProtocolo,
  entradaEvolucao,
} from '../src/storage/sessao'
import { formatarSessaoParaTexto } from '../src/storage/exportar'
import type { ResultadoCalculado } from '../src/engine/calculator'
import type { NoConclusao } from '../src/content/protocol-flows/types'

const resultadoClassificado: ResultadoCalculado = {
  id: 'debito-cardiaco',
  label: 'Débito cardíaco',
  unidade: 'L/min',
  valor: 4.4,
  faixaReferencia: { min: 4, max: 8 },
  origem: 'ebook',
  paginaEbook: 20,
  tipo: 'classificado',
  texto: 'Dentro da normalidade.',
  severidade: 'normal',
}

const conclusaoMista: NoConclusao = {
  tipo: 'conclusao',
  diagnostico: ['Cardiogênico', 'Distributivo (séptico)'],
  confianca: 'baixa',
  justificativa: 'Achados compatíveis com choque misto.',
  proximosPassos: ['Suporte inotrópico', 'Antibióticos e reposição volêmica'],
  cuidado: 'Integrar sempre ao quadro clínico completo.',
}

describe('sessão de exame — lógica pura', () => {
  it('novaSessao começa vazia, com criadoEm === atualizadoEm', () => {
    const s = novaSessao('Leito 4', () => '2026-01-01T00:00:00.000Z')
    expect(s.titulo).toBe('Leito 4')
    expect(s.entradas).toEqual([])
    expect(s.criadoEm).toBe(s.atualizadoEm)
    expect(s.id).toBeTruthy()
  })

  it('comEntrada adiciona ao fim e atualiza atualizadoEm', () => {
    const s0 = novaSessao('x', () => '2026-01-01T00:00:00.000Z')
    const e1 = entradaEvolucao('primeira', () => '2026-01-01T00:01:00.000Z')
    const e2 = entradaEvolucao('segunda', () => '2026-01-01T00:02:00.000Z')
    const s1 = comEntrada(s0, e1, () => '2026-01-01T00:01:00.000Z')
    const s2 = comEntrada(s1, e2, () => '2026-01-01T00:02:00.000Z')
    expect(s2.entradas.map((e) => e.id)).toEqual([e1.id, e2.id])
    expect(s2.atualizadoEm).toBe('2026-01-01T00:02:00.000Z')
    expect(s2.criadoEm).toBe('2026-01-01T00:00:00.000Z') // criadoEm nunca muda
  })

  it('semEntrada remove só a entrada pedida, mantém as outras', () => {
    let s = novaSessao()
    const e1 = entradaEvolucao('a')
    const e2 = entradaEvolucao('b')
    s = comEntrada(s, e1)
    s = comEntrada(s, e2)
    const depois = semEntrada(s, e1.id)
    expect(depois.entradas.map((e) => e.id)).toEqual([e2.id])
  })

  it('comTitulo troca o título sem tocar nas entradas', () => {
    let s = novaSessao('original')
    s = comEntrada(s, entradaEvolucao('nota'))
    const renomeada = comTitulo(s, 'novo título')
    expect(renomeada.titulo).toBe('novo título')
    expect(renomeada.entradas).toEqual(s.entradas)
  })

  it('entradaCalculadora copia label/valor/unidade/texto/severidade/origem do resultado', () => {
    const e = entradaCalculadora('debito-cardiaco', 'Débito Cardíaco', resultadoClassificado)
    expect(e.tipo).toBe('calculadora')
    expect(e.calculadoraId).toBe('debito-cardiaco')
    expect(e.resultadoId).toBe('debito-cardiaco')
    expect(e.label).toBe('Débito cardíaco')
    expect(e.valor).toBe(4.4)
    expect(e.unidade).toBe('L/min')
    expect(e.texto).toBe('Dentro da normalidade.')
    expect(e.severidade).toBe('normal')
    expect(e.origem).toBe('ebook')
  })

  it('entradaCalculadora não copia severidade quando o resultado não é "classificado"', () => {
    const naoClassificado: ResultadoCalculado = {
      ...resultadoClassificado,
      tipo: 'nao_classificado',
      texto: 'Não classificado pelo ebook.',
    }
    const e = entradaCalculadora('epss', 'EPSS', naoClassificado)
    expect(e.severidade).toBeUndefined()
  })

  it('entradaProtocolo copia diagnostico (inclusive array), confianca, justificativa, proximosPassos e cuidado', () => {
    const e = entradaProtocolo('protocolo-rush', 'Protocolo RUSH', conclusaoMista)
    expect(e.tipo).toBe('protocolo')
    expect(e.diagnostico).toEqual(['Cardiogênico', 'Distributivo (séptico)'])
    expect(e.confianca).toBe('baixa')
    expect(e.proximosPassos).toHaveLength(2)
    expect(e.cuidado).toBe(conclusaoMista.cuidado)
  })

  it('entradaEvolucao guarda o texto literal', () => {
    const e = entradaEvolucao('Paciente estável, sem intercorrências.')
    expect(e.tipo).toBe('evolucao')
    expect(e.texto).toBe('Paciente estável, sem intercorrências.')
  })
})

describe('formatarSessaoParaTexto', () => {
  it('inclui título, cada entrada e sempre termina com a ressalva de integração clínica', () => {
    let s = novaSessao('Leito 4', () => '2026-01-01T00:00:00.000Z')
    s = comEntrada(s, entradaCalculadora('debito-cardiaco', 'Débito Cardíaco', resultadoClassificado))
    s = comEntrada(s, entradaProtocolo('protocolo-rush', 'Protocolo RUSH', conclusaoMista))
    s = comEntrada(s, entradaEvolucao('Sem intercorrências.'))

    const texto = formatarSessaoParaTexto(s, () => new Date('2026-01-01T12:00:00Z'))

    expect(texto).toContain('Leito 4')
    expect(texto).toContain('Débito Cardíaco')
    expect(texto).toContain('4.4 L/min')
    expect(texto).toContain('Protocolo RUSH')
    expect(texto).toContain('Cardiogênico + Distributivo (séptico)')
    expect(texto).toContain('Sem intercorrências.')
    // a ressalva de segurança clínica nunca pode faltar num resumo exportado
    expect(texto).toMatch(/não substitui/i)
  })

  it('sessão vazia ainda produz um texto válido, sem inventar itens', () => {
    const s = novaSessao('Vazia', () => '2026-01-01T00:00:00.000Z')
    const texto = formatarSessaoParaTexto(s, () => new Date('2026-01-01T12:00:00Z'))
    expect(texto).toContain('nenhum item adicionado ainda')
    expect(texto).toMatch(/não substitui/i)
  })
})
