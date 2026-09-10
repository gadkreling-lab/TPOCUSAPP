/**
 * POST /api/ativar { codigo: string, deviceId: string }
 *
 * Ativa um código de acesso neste aparelho (ou transfere de outro aparelho para
 * este). Ver ARQUITETURA.md §6.
 *
 * Resposta 200: { tokenAcesso, tokenRenovacao, expiraEm }
 * Resposta 4xx: { motivo, mensagem }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getKVStore } from './_lib/kv.js'
import { segredoDoAmbiente } from './_lib/token.js'
import { ativarCodigo } from './_lib/acesso.js'

const MENSAGENS: Record<string, string> = {
  codigo_invalido: 'Código de acesso inválido.',
  codigo_revogado: 'Este código de acesso foi revogado.',
  corpo_invalido: 'Requisição inválida: informe código e identificador do aparelho.',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use POST.' })
  }

  const corpo = req.body as { codigo?: unknown; deviceId?: unknown } | undefined
  const codigo = typeof corpo?.codigo === 'string' ? corpo.codigo.trim() : ''
  const deviceId = typeof corpo?.deviceId === 'string' ? corpo.deviceId.trim() : ''
  if (!codigo || !deviceId) {
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
  const resultado = await ativarCodigo(kv, segredo, codigo, deviceId)

  if (!resultado.ok) {
    return res.status(403).json({ motivo: resultado.motivo, mensagem: MENSAGENS[resultado.motivo] })
  }

  return res.status(200).json({
    tokenAcesso: resultado.sessao.tokenAcesso,
    tokenRenovacao: resultado.sessao.tokenRenovacao,
    expiraEm: resultado.sessao.expiraEm,
  })
}
