import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MemoryKV } from '../api/_lib/kv'
import { ativarCodigo, criarCodigo } from '../api/_lib/acesso'
import { criarHandlerConteudo, criarHandlerConteudoDinamico } from '../api/_lib/conteudo'

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

/**
 * criarHandlerConteudoDinamico — api/conteudo.ts, o handler que consolidou os
 * 10 endpoints de conteúdo numa função só por causa do limite de 12 Serverless
 * Functions do plano Hobby (ver ARQUITETURA.md). Nunca teve teste próprio até agora
 * (só o criarHandlerConteudo original, que nenhuma rota usa mais) — o ponto mais
 * importante aqui é confirmar que req.query.recurso escolhe o item CERTO dentro de um
 * mapa com vários recursos, não só que um mapa de um item só funciona.
 */
describe('handler genérico de conteúdo (multi-recurso, api/conteudo.ts)', () => {
  const windows = [{ id: 'janela-a' }]
  const findings = [{ id: 'achado-a' }]
  const protocolFlows = [{ id: 'fluxo-a' }]
  const handler = criarHandlerConteudoDinamico({ windows, findings, 'protocol-flows': protocolFlows })

  beforeEach(() => {
    process.env.TOKEN_SECRET = SEGREDO_TESTE
  })

  async function reqAutenticado(recurso: string): Promise<VercelRequest> {
    const kv = new MemoryKV()
    await criarCodigo(kv, 'COD1', 180)
    const ativacao = await ativarCodigo(kv, SEGREDO_TESTE, 'COD1', 'dev-1')
    if (!ativacao.ok) throw new Error('setup falhou')
    return {
      method: 'GET',
      headers: { authorization: `Bearer ${ativacao.sessao.tokenAcesso}` },
      query: { recurso },
    } as unknown as VercelRequest
  }

  it('recusa sem cabeçalho Authorization', () => {
    const req = { method: 'GET', headers: {}, query: { recurso: 'windows' } } as unknown as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(401)
  })

  it('recusa método diferente de GET', () => {
    const req = { method: 'POST', headers: {}, query: { recurso: 'windows' } } as unknown as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(405)
  })

  it('serve o recurso pedido — não outro do mesmo mapa', async () => {
    const req = await reqAutenticado('windows')
    const res = mockRes()
    await handler(req, res)
    expect(res._status).toBe(200)
    expect(res._json).toEqual(windows)
  })

  it('resolve um recurso com hífen no nome (ex.: protocol-flows)', async () => {
    const req = await reqAutenticado('protocol-flows')
    const res = mockRes()
    await handler(req, res)
    expect(res._status).toBe(200)
    expect(res._json).toEqual(protocolFlows)
  })

  it('devolve o SEGUNDO recurso corretamente (não sempre o primeiro do mapa)', async () => {
    const req = await reqAutenticado('findings')
    const res = mockRes()
    await handler(req, res)
    expect(res._status).toBe(200)
    expect(res._json).toEqual(findings)
  })

  it('devolve 404 para um recurso que não existe no mapa', async () => {
    const req = await reqAutenticado('recurso-inexistente')
    const res = mockRes()
    await handler(req, res)
    expect(res._status).toBe(404)
  })

  it('devolve 404 quando recurso não vem na query (ex.: rota mal configurada)', async () => {
    const kv = new MemoryKV()
    await criarCodigo(kv, 'COD1', 180)
    const ativacao = await ativarCodigo(kv, SEGREDO_TESTE, 'COD1', 'dev-1')
    if (!ativacao.ok) throw new Error('setup falhou')
    const req = {
      method: 'GET',
      headers: { authorization: `Bearer ${ativacao.sessao.tokenAcesso}` },
      query: {},
    } as unknown as VercelRequest
    const res = mockRes()
    handler(req, res)
    expect(res._status).toBe(404)
  })
})
