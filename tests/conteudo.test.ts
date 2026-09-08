import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MemoryKV } from '../api/_lib/kv'
import { ativarCodigo, criarCodigo } from '../api/_lib/acesso'
import { criarHandlerConteudo } from '../api/_lib/conteudo'

const SEGREDO_TESTE = 'segredo-de-teste-bem-longo-o-suficiente'

function mockRes() {
  const res: Partial<VercelResponse> & { _status?: number; _json?: unknown; _headers: Record<string, string> } = {
    _headers: {},
  }
  res.setHeader = vi.fn((k: string, v: string) => {
    res._headers[k] = v
    return res as VercelResponse
  }) as VercelResponse['setHeader']
  res.status = vi.fn((code: number) => {
    res._status = code
    return res as VercelResponse
  }) as VercelResponse['status']
  res.json = vi.fn((body: unknown) => {
    res._json = body
    return res as VercelResponse
  }) as VercelResponse['json']
  return res as VercelResponse & { _status?: number; _json?: unknown; _headers: Record<string, string> }
}

describe('handler genérico de conteúdo', () => {
  const dadosFalsos = [{ id: 'a' }, { id: 'b' }]
  const handler = criarHandlerConteudo(dadosFalsos)

  beforeEach(() => {
    process.env.TOKEN_SECRET = SEGREDO_TESTE
  })

  it('recusa sem cabeçalho Authorization', () => {
    const req = { method: 'GET', headers: {} } as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(401)
  })

  it('recusa com token inválido', () => {
    const req = { method: 'GET', headers: { authorization: 'Bearer token-forjado' } } as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(401)
  })

  it('recusa método diferente de GET', () => {
    const req = { method: 'POST', headers: {} } as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(405)
  })

  it('serve o conteúdo com token de acesso válido', async () => {
    const kv = new MemoryKV()
    await criarCodigo(kv, 'COD1', 180)
    const ativacao = await ativarCodigo(kv, SEGREDO_TESTE, 'COD1', 'dev-1')
    if (!ativacao.ok) throw new Error('setup falhou')

    const req = {
      method: 'GET',
      headers: { authorization: `Bearer ${ativacao.sessao.tokenAcesso}` },
    } as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(200)
    expect(res._json).toEqual(dadosFalsos)
    expect(res._headers['Cache-Control']).toBe('no-store')
  })
})
