import type {
  CalculatorDef,
  Condicao,
  FaixaInterpretacao,
  ResultDef,
} from '../../content/calculators/types'
import type { Severidade } from '../../content/types'
import { avaliarFormula, ErroFormula, ErroVariavelAusente } from './formula'

export type ValorCampo = number | boolean | string | undefined

/** Saída de UM resultado, depois de aplicar fórmula + interpretação. */
export type ResultadoCalculado = {
  id: string
  label: string
  unidade: string
  valor: number
  faixaReferencia?: { min: number; max: number }
  origem: 'ebook' | 'complementar'
  paginaEbook?: number
} & (
  | { tipo: 'classificado'; texto: string; severidade: Severidade }
  /** nenhuma faixa do ebook cobre este valor — nunca aproximamos para a vizinha (CLAUDE.md Regra 1). */
  | { tipo: 'nao_classificado'; texto: string }
  /** pré-condição clínica falhou (ex.: valvopatia no EPSS, gate da VCI mecânica) — interpretação substituída. */
  | { tipo: 'aviso'; texto: string }
)

function numeroDoCampo(v: ValorCampo): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'boolean') return v ? 1 : 0
  return undefined
}

function avaliarCondicao(c: Condicao, variaveis: Record<string, number>): boolean {
  const v = variaveis[c.variavel]
  if (v === undefined) return false
  switch (c.operador) {
    case '<':
      return v < c.valor!
    case '<=':
      return v <= c.valor!
    case '>':
      return v > c.valor!
    case '>=':
      return v >= c.valor!
    case 'igual':
      return v === c.valor!
    case 'entreExclusive':
      return v > c.min! && v < c.max!
    case 'entreInclusive':
      return v >= c.min! && v <= c.max!
  }
}

function classificar(faixas: FaixaInterpretacao[], variaveis: Record<string, number>): FaixaInterpretacao | null {
  for (const faixa of faixas) {
    if (faixa.condicoes.every((c) => avaliarCondicao(c, variaveis))) return faixa
  }
  return null
}

function avisoAtivo(resultado: ResultDef, valoresCampos: Record<string, ValorCampo>): string | null {
  for (const av of resultado.avisosCondicionais ?? []) {
    const booleanos = av.campos.map((id) => valoresCampos[id] === true)
    const disparado = av.modo === 'qualquerVerdadeiro' ? booleanos.some(Boolean) : booleanos.some((b) => !b)
    if (disparado) return av.mensagem
  }
  return null
}

export interface SaidaCalculadora {
  resultados: ResultadoCalculado[]
  /** ids de resultados que não puderam ser calculados (fórmula com variável faltando etc.) — não deveria acontecer em uso normal do formulário, mas o motor não esconde erros. */
  erros: { id: string; mensagem: string }[]
}

/**
 * Avalia todos os `resultados` de um CalculatorDef contra os valores atuais do
 * formulário. Resultados são processados na ordem declarada — um resultado pode
 * referenciar, na sua fórmula ou nas condições de faixa, o id de um resultado
 * anterior (ex.: débito cardíaco usa o volume sistólico já calculado).
 */
export function avaliarCalculadora(def: CalculatorDef, valoresCampos: Record<string, ValorCampo>): SaidaCalculadora {
  const variaveis: Record<string, number> = {}
  for (const campo of def.campos) {
    const n = numeroDoCampo(valoresCampos[campo.id])
    if (n !== undefined) variaveis[campo.id] = n
  }

  const resultados: ResultadoCalculado[] = []
  const erros: SaidaCalculadora['erros'] = []

  for (const r of def.resultados) {
    if (r.somenteSeCamposPreenchidos?.some((id) => valoresCampos[id] === undefined || valoresCampos[id] === '')) {
      continue
    }
    if (r.somenteSeCampo && valoresCampos[r.somenteSeCampo.id] !== r.somenteSeCampo.valor) {
      continue
    }

    let valor: number
    try {
      valor = avaliarFormula(r.formula, variaveis)
    } catch (e) {
      if (e instanceof ErroVariavelAusente) {
        // Estado normal de formulário incompleto (o aluno ainda não preencheu um
        // campo do qual este resultado depende) — omite em silêncio, não é erro.
        continue
      }
      erros.push({ id: r.id, mensagem: e instanceof ErroFormula ? e.message : String(e) })
      continue
    }
    // Arredonda o resultado de ponto flutuante antes de classificar. Sem isso, um
    // valor clinicamente "exatamente 18" pode virar 17.999999999999996 ou
    // 18.000000000000004 dependendo da ordem das operações de ponto flutuante do
    // IEEE754 — o mesmo paciente cairia em ramos diferentes (classificado vs. lacuna
    // do ebook) por ruído de arredondamento, não por diferença clínica real. 6 casas
    // decimais é precisão de sobra para qualquer medida de ultrassom.
    valor = Math.round(valor * 1e6) / 1e6
    variaveis[r.id] = valor

    const base = {
      id: r.id,
      label: r.label,
      unidade: r.unidade,
      valor,
      faixaReferencia: r.faixaReferencia,
      origem: r.origem,
      paginaEbook: r.paginaEbook,
    }

    const aviso = avisoAtivo(r, valoresCampos)
    if (aviso) {
      resultados.push({ ...base, tipo: 'aviso', texto: aviso })
      continue
    }

    const faixa = classificar(r.faixas, variaveis)
    if (faixa) {
      resultados.push({ ...base, tipo: 'classificado', texto: faixa.texto, severidade: faixa.severidade })
    } else {
      resultados.push({ ...base, tipo: 'nao_classificado', texto: r.textoNaoClassificado })
    }
  }

  return { resultados, erros }
}
