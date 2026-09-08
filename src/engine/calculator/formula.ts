/**
 * Parser e avaliador de fórmulas simbólicas — SEM eval, SEM new Function.
 * Ver ARQUITETURA.md §3.2.
 *
 * Grammar (só o necessário para as calculadoras do spec):
 *   expressao := termo (("+" | "-") termo)*
 *   termo     := unario (("*" | "/") unario)*
 *   unario    := "-" unario | potencia
 *   potencia  := base ("^" unario)?          // ^ associa à direita
 *   base      := numero | "pi" | identificador | "sqrt" "(" expressao ")" | "(" expressao ")"
 *
 * `identificador` é resolvido contra um mapa de variáveis (campos + resultados já
 * calculados do mesmo calculator) fornecido pelo chamador — o parser em si não sabe
 * nada de conteúdo clínico.
 */

export class ErroFormula extends Error {}

/**
 * Caso específico de ErroFormula: uma variável referenciada na fórmula ainda não tem
 * valor. Isso é o estado NORMAL de um formulário em preenchimento (o aluno ainda não
 * digitou aquele campo) — não é um erro de conteúdo nem de cálculo. O motor
 * (avaliar.ts) trata esta subclasse de forma diferente das demais: omite o resultado
 * em silêncio, em vez de reportar como falha visível ao usuário.
 */
export class ErroVariavelAusente extends ErroFormula {}

type TipoToken = 'NUM' | 'IDENT' | '+' | '-' | '*' | '/' | '^' | '(' | ')' | 'EOF'
interface Token {
  tipo: TipoToken
  valor?: string
}

function tokenizar(formula: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < formula.length) {
    const c = formula[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if ('+-*/^()'.includes(c)) {
      tokens.push({ tipo: c as TipoToken })
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < formula.length && /[0-9.]/.test(formula[j])) j++
      tokens.push({ tipo: 'NUM', valor: formula.slice(i, j) })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i
      while (j < formula.length && /[a-zA-Z0-9_]/.test(formula[j])) j++
      tokens.push({ tipo: 'IDENT', valor: formula.slice(i, j) })
      i = j
      continue
    }
    throw new ErroFormula(`caractere inesperado "${c}" na fórmula "${formula}"`)
  }
  tokens.push({ tipo: 'EOF' })
  return tokens
}

class Parser {
  private pos = 0
  constructor(
    private tokens: Token[],
    private variaveis: Record<string, number>,
    private formulaOriginal: string,
  ) {}

  private atual(): Token {
    return this.tokens[this.pos]
  }

  private consumir(tipo: TipoToken): Token {
    const t = this.atual()
    if (t.tipo !== tipo) {
      throw new ErroFormula(`esperava "${tipo}" mas encontrou "${t.tipo}" na fórmula "${this.formulaOriginal}"`)
    }
    this.pos++
    return t
  }

  parse(): number {
    const valor = this.expressao()
    this.consumir('EOF')
    return valor
  }

  private expressao(): number {
    let valor = this.termo()
    while (this.atual().tipo === '+' || this.atual().tipo === '-') {
      const op = this.consumir(this.atual().tipo).tipo
      const direita = this.termo()
      valor = op === '+' ? valor + direita : valor - direita
    }
    return valor
  }

  private termo(): number {
    let valor = this.unario()
    while (this.atual().tipo === '*' || this.atual().tipo === '/') {
      const op = this.consumir(this.atual().tipo).tipo
      const direita = this.unario()
      if (op === '/' && direita === 0) {
        throw new ErroFormula(`divisão por zero na fórmula "${this.formulaOriginal}"`)
      }
      valor = op === '*' ? valor * direita : valor / direita
    }
    return valor
  }

  private unario(): number {
    if (this.atual().tipo === '-') {
      this.consumir('-')
      return -this.unario()
    }
    return this.potencia()
  }

  private potencia(): number {
    const base = this.base()
    if (this.atual().tipo === '^') {
      this.consumir('^')
      const expoente = this.unario()
      return Math.pow(base, expoente)
    }
    return base
  }

  private base(): number {
    const t = this.atual()
    if (t.tipo === 'NUM') {
      this.consumir('NUM')
      return Number(t.valor)
    }
    if (t.tipo === '(') {
      this.consumir('(')
      const valor = this.expressao()
      this.consumir(')')
      return valor
    }
    if (t.tipo === 'IDENT') {
      this.consumir('IDENT')
      const nome = t.valor!
      if (nome === 'pi') return Math.PI
      if (nome === 'sqrt') {
        this.consumir('(')
        const arg = this.expressao()
        this.consumir(')')
        if (arg < 0) throw new ErroFormula(`sqrt de valor negativo na fórmula "${this.formulaOriginal}"`)
        return Math.sqrt(arg)
      }
      if (!(nome in this.variaveis)) {
        throw new ErroVariavelAusente(`variável "${nome}" não definida ao avaliar "${this.formulaOriginal}"`)
      }
      return this.variaveis[nome]
    }
    throw new ErroFormula(`token inesperado "${t.tipo}" na fórmula "${this.formulaOriginal}"`)
  }
}

/**
 * Avalia uma fórmula simbólica contra um mapa de variáveis (ids de campos e de
 * resultados já calculados). Lança ErroFormula em caso de sintaxe inválida, variável
 * desconhecida, divisão por zero ou raiz de negativo — nunca retorna NaN silenciosamente.
 */
export function avaliarFormula(formula: string, variaveis: Record<string, number>): number {
  const tokens = tokenizar(formula)
  const resultado = new Parser(tokens, variaveis, formula).parse()
  if (!Number.isFinite(resultado)) {
    throw new ErroFormula(`resultado não finito ao avaliar "${formula}"`)
  }
  return resultado
}
