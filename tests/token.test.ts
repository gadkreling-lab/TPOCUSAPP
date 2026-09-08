import { describe, expect, it } from 'vitest'
import { assinarSessao, verificarSessao } from '../api/_lib/token'

const SEGREDO = 'segredo-de-teste-bem-longo-o-suficiente'

describe('token', () => {
  it('assina e verifica um payload válido', () => {
    const token = assinarSessao({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 900)
    const payload = verificarSessao(token, SEGREDO)
    expect(payload).toEqual({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'acesso', exp: payload!.exp })
  })

  it('rejeita token expirado', () => {
    const agora = 1_000_000
    const token = assinarSessao({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 60, agora)
    const payload = verificarSessao(token, SEGREDO, agora + 61)
    expect(payload).toBeNull()
  })

  it('aceita token no limite exato do exp', () => {
    const agora = 1_000_000
    const token = assinarSessao({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 60, agora)
    const payload = verificarSessao(token, SEGREDO, agora + 60)
    expect(payload).not.toBeNull()
  })

  it('rejeita assinatura adulterada', () => {
    const token = assinarSessao({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 900)
    const [corpo] = token.split('.')
    const adulterado = `${corpo}.assinaturafalsaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
    expect(verificarSessao(adulterado, SEGREDO)).toBeNull()
  })

  it('rejeita payload adulterado (corpo trocado, assinatura antiga)', () => {
    const tokenA = assinarSessao({ codigo: 'AAAA', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 900)
    const tokenB = assinarSessao({ codigo: 'BBBB', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 900)
    const [, assinaturaB] = tokenB.split('.')
    const [corpoA] = tokenA.split('.')
    const frankenstein = `${corpoA}.${assinaturaB}`
    expect(verificarSessao(frankenstein, SEGREDO)).toBeNull()
  })

  it('rejeita verificação com segredo errado', () => {
    const token = assinarSessao({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'acesso' }, SEGREDO, 900)
    expect(verificarSessao(token, 'outro-segredo-completamente-diferente')).toBeNull()
  })

  it('rejeita token de renovação verificado sem checar `tipo` corretamente distingue de acesso', () => {
    const token = assinarSessao({ codigo: 'ABC123', deviceId: 'dev-1', tipo: 'renovacao' }, SEGREDO, 900)
    const payload = verificarSessao(token, SEGREDO)
    expect(payload?.tipo).toBe('renovacao')
  })

  it('rejeita token malformado (sem ponto)', () => {
    expect(verificarSessao('nao-e-um-token', SEGREDO)).toBeNull()
  })
})
