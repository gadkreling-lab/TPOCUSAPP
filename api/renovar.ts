/**
 * POST /api/renovar { tokenRenovacao: string }
 *
 * Renovação silenciosa do token de acesso, disparada pelo app pouco antes do token
 * atual expirar (~15 min). É aqui que prazo, revogação e troca de aparelho são
 * checados contra o KV — ver ARQUITETURA.md §6.
 *
 * Resposta 200: { tokenAcesso, tokenRenovacao, expiraEm }
 * Resposta 4xx: { motivo, mensagem }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getKVStore } from './_lib/kv.js'
import { segredoDoAmbiente } from './_lib/token.js'
import { renovarSessao } from './_lib/acesso.js'

const MENSAGENS: Record<string, string> = {
  token_invalido: 'Sessão inválida. Ative seu código de acesso novamente.',
  codigo_revogado: 'Este código de acesso foi revogado.',
  expirado: 'Seu acesso expirou.',
  aparelho_diferente: 'Este código foi ativado em outro aparelho.',
  corpo_invalido: 'Requisição inválida: informe o token de renovação.',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use POST.' })
  }

  const corpo = req.body as { tokenRenovacao?: unknown } | undefined
  const tokenRenovacao = typeof corpo?.tokenRenovacao === 'string' ? corpo.tokenRenovacao : ''
  if (!tokenRenovacao) {
    return res.status(400).json({ motivo: 'corpo_invalido', mensagem: MENSAGENS.corpo_invalido })
  }

  let segredo: string
  try {
    segredo = segredoDoAmbiente()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ motivo: 'erro_servidor', mensagem: 'Erro de configuração do servidor.' })
  }

  const kv = await getKVStore()
  const resultado = await renovarSessao(kv, segredo, tokenRenovacao)

  if (!resultado.ok) {
    return res.status(403).json({ motivo: resultado.motivo, mensagem: MENSAGENS[resultado.motivo] })
  }

  return res.status(200).json({
    tokenAcesso: resultado.sessao.tokenAcesso,
    tokenRenovacao: resultado.sessao.tokenRenovacao,
    expiraEm: resultado.sessao.expiraEm,
  })
}
