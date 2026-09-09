/**
 * GET  /api/admin/codigos            → lista todos os códigos com status calculado.
 * POST /api/admin/codigos { quantidade, duracaoDias } → gera um lote de códigos novos.
 *
 * Autenticado por senha de administrador (Bearer, api/_lib/adminAuth.ts) — separada
 * do token de sessão do aluno. Ver ARQUITETURA.md §6.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { autenticarAdmin } from '../_lib/adminAuth'
import { getKVStore } from '../_lib/kv'
import { criarCodigos, listarCodigos } from '../_lib/acesso'

const MAX_LOTE = 200

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!autenticarAdmin(req)) {
    return res.status(401).json({ motivo: 'nao_autenticado', mensagem: 'Senha de administrador ausente ou incorreta.' })
  }

  const kv = await getKVStore()

  if (req.method === 'GET') {
    const codigos = await listarCodigos(kv)
    return res.status(200).json({ codigos })
  }

  if (req.method === 'POST') {
    const corpo = req.body as { quantidade?: unknown; duracaoDias?: unknown } | undefined
    const quantidade = typeof corpo?.quantidade === 'number' ? Math.trunc(corpo.quantidade) : NaN
    const duracaoDias = typeof corpo?.duracaoDias === 'number' ? Math.trunc(corpo.duracaoDias) : NaN

    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_LOTE) {
      return res
        .status(400)
        .json({ motivo: 'corpo_invalido', mensagem: `"quantidade" deve ser um inteiro entre 1 e ${MAX_LOTE}.` })
    }
    if (!Number.isInteger(duracaoDias) || duracaoDias < 1) {
      return res.status(400).json({ motivo: 'corpo_invalido', mensagem: '"duracaoDias" deve ser um inteiro positivo.' })
    }

    const codigos = await criarCodigos(kv, quantidade, duracaoDias)
    return res.status(201).json({ codigos })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use GET ou POST.' })
}
