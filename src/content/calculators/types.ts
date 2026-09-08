/**
 * Tipos das calculadoras (Módulo 2) — content é dado, motor é código.
 * Ver ARQUITETURA.md §2.1 e §3.2.
 *
 * Regra central igual ao resto do content pack: nenhum valor de corte, fórmula ou
 * faixa aqui é decidido pelo motor — tudo vem destes arquivos. Onde o ebook deixa uma
 * lacuna real entre faixas (ex.: EPSS exatamente 7 mm, Brockelsby exatamente 3 EIC —
 * ver CLAUDE.md Regra 1), NÃO existe uma `Condicao` cobrindo esse valor, e o motor
 * (src/engine/calculator/) deve reportar "não classificado pelo ebook" em vez de
 * escolher a faixa vizinha.
 */
import type { Severidade } from '../types'

export type TipoCampo = 'numero' | 'booleano' | 'selecao'

export interface OpcaoSelecao {
  valor: string
  label: string
}

export interface FieldDef {
  id: string
  label: string
  tipo: TipoCampo
  unidade?: string
  /** para tipo 'numero' */
  min?: number
  max?: number
  step?: number
  /** para tipo 'numero' — opcional de verdade (ex.: peso/altura do Índice Cardíaco) */
  opcional?: boolean
  /** para tipo 'selecao' */
  opcoes?: OpcaoSelecao[]
  /** valor inicial (usado sobretudo em 'selecao', para não deixar o gate marcado por padrão) */
  padrao?: string | boolean
  /** liga o preview de sensibilidade em tempo real (±1 mm) — hoje só o TSVE usa isso */
  ajudaRapidaImpacto?: boolean
  /** agrupamento visual — ex.: os 4 itens do gate de pré-requisitos da VCI mecânica */
  grupo?: string
  /** só mostra este campo se outro campo (tipicamente 'selecao') tiver este valor */
  somenteSeCampo?: { id: string; valor: string }
  /** texto de apoio mostrado sob o campo — ex.: "Referência do ebook: 1,7–2,3 cm".
   *  Só informativo, não valida/bloqueia (um paciente real pode estar fora da faixa). */
  dicaFaixa?: string
}

export type Operador = '<' | '<=' | '>' | '>=' | 'entreExclusive' | 'entreInclusive' | 'igual'

export interface Condicao {
  /** id de um campo ou de outro resultado do mesmo calculator */
  variavel: string
  operador: Operador
  valor?: number
  min?: number
  max?: number
}

export interface FaixaInterpretacao {
  /** todas as condições precisam ser verdadeiras (E lógico) — 1 item é o caso comum;
   *  2+ é uma condição composta (ex.: VCI espontânea cruza diâmetro E colapsabilidade). */
  condicoes: Condicao[]
  texto: string
  severidade: Severidade
  origem: 'ebook' | 'complementar'
}

/** Substitui a interpretação por um aviso fixo, sem esconder o valor calculado. */
export interface AvisoCondicional {
  /** ids de campos booleanos que compõem a condição */
  campos: string[]
  /** 'qualquerVerdadeiro': dispara se algum desses campos estiver marcado (ex.: EPSS —
   *  valvopatia OU prótese mitral). 'algumFalso': dispara se algum estiver desmarcado
   *  (ex.: gate de 4 pré-requisitos da VCI mecânica — qualquer um que falhar já invalida). */
  modo: 'qualquerVerdadeiro' | 'algumFalso'
  mensagem: string
}

export interface ResultDef {
  id: string
  label: string
  unidade: string
  /** string simbólica resolvida pelo motor — grammar: + - * / ^ ( ) sqrt() pi,
   *  operandos = ids de `campos` ou de outro `resultados` deste mesmo calculator. */
  formula: string
  /** faixa mostrada como referência (não necessariamente igual às faixas de interpretação). */
  faixaReferencia?: { min: number; max: number }
  faixas: FaixaInterpretacao[]
  /** texto mostrado quando nenhuma faixa bate — nunca aproxima para a mais próxima. */
  textoNaoClassificado: string
  origem: 'ebook' | 'complementar'
  paginaEbook?: number
  /** avaliados em ordem — o primeiro que disparar vence (ex.: EPSS tem 2 avisos com
   *  mensagens diferentes: valvopatia OU prótese mitral, cada um com seu próprio texto). */
  avisosCondicionais?: AvisoCondicional[]
  /** só computa/mostra este resultado se TODOS estes campos opcionais estiverem preenchidos. */
  somenteSeCamposPreenchidos?: string[]
  /** só computa/mostra este resultado se um campo (tipicamente 'selecao') tiver este valor. */
  somenteSeCampo?: { id: string; valor: string }
}

export interface CalculatorDef {
  id: string
  nome: string
  /** null só quando TODO resultado desta calculadora for complementar (não é o caso hoje). */
  paginaEbook: number | null
  campos: FieldDef[]
  resultados: ResultDef[]
  comoMedir: string[]
  armadilhas: string[]
  dicas?: string[]
}
