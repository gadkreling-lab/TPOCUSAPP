import { describe, expect, it } from 'vitest'
import { avaliarFormula, ErroFormula } from '../src/engine/calculator/formula'

describe('avaliarFormula — parser restrito', () => {
  it('resolve operadores básicos e precedência', () => {
    expect(avaliarFormula('2 + 3 * 4', {})).toBe(14)
    expect(avaliarFormula('(2 + 3) * 4', {})).toBe(20)
    expect(avaliarFormula('10 / 2 / 5', {})).toBe(1)
    expect(avaliarFormula('2 ^ 3', {})).toBe(8)
    expect(avaliarFormula('2 ^ 3 ^ 2', {})).toBe(512) // ^ associa à direita: 2^(3^2)
  })

  it('resolve pi e sqrt', () => {
    expect(avaliarFormula('pi', {})).toBeCloseTo(Math.PI, 10)
    expect(avaliarFormula('sqrt(16)', {})).toBe(4)
    expect(avaliarFormula('sqrt(2*8)', {})).toBe(4)
  })

  it('resolve variáveis do mapa fornecido', () => {
    expect(avaliarFormula('pi * (diametro/2)^2', { diametro: 2 })).toBeCloseTo(Math.PI, 10)
  })

  it('suporta unário negativo', () => {
    expect(avaliarFormula('-5 + 10', {})).toBe(5)
    expect(avaliarFormula('3 * -2', {})).toBe(-6)
  })

  it('rejeita variável desconhecida', () => {
    expect(() => avaliarFormula('x + 1', {})).toThrow(ErroFormula)
  })

  it('rejeita divisão por zero', () => {
    expect(() => avaliarFormula('1 / 0', {})).toThrow(ErroFormula)
  })

  it('rejeita raiz de número negativo', () => {
    expect(() => avaliarFormula('sqrt(-4)', {})).toThrow(ErroFormula)
  })

  it('rejeita sintaxe inválida', () => {
    expect(() => avaliarFormula('2 + + 3', {})).toThrow(ErroFormula)
    expect(() => avaliarFormula('2 +', {})).toThrow(ErroFormula)
    expect(() => avaliarFormula('(2 + 3', {})).toThrow(ErroFormula)
  })

  it('rejeita caractere fora da gramática (sem eval — não executa JS arbitrário)', () => {
    expect(() => avaliarFormula('console.log(1)', {})).toThrow(ErroFormula)
    expect(() => avaliarFormula('1; alert(1)', {})).toThrow(ErroFormula)
  })
})
