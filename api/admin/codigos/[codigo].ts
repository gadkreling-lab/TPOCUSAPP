/**
 * POST /api/admin/codigos/:codigo { acao: 'revogar' } → revoga o código.
 * POST /api/admin/codigos/:codigo { acao: 'estender', dias: number } → soma `dias` ao
 *   `expiraEm` atual (só funciona em código já ativado — ver api/_lib/acesso.ts).
 *
 * Duas ações num único endpoint dinâmico em vez de duas rotas — mesmo raciocínio de
 * api/content/images/[arquivo].ts, um arquivo por recurso (o código), o corpo decide
 * a operação.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { autenticarAdmin } from '../../_lib/adminAuth.js'
import { getKVStore } from '../../_lib/kv.js'
import { estenderPrazo, revogarCodigo } from '../../_lib/acesso.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!autenticarAdmin(req)) {
    return res.status(401).json({ motivo: 'nao_autenticado', mensagem: 'Senha de administrador ausente ou incorreta.' })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use POST.' })
  }

  const codigo = typeof req.query.codigo === 'string' ? req.query.codigo : ''
  if (!codigo) {
    return res.status(400).json({ motivo: 'corpo_invalido', mensagem: 'Código ausente na URL.' })
  }

  const corpo = req.body as { acao?: unknown; dias?: unknown } | undefined
  const kv = await getKVStore()

  if (corpo?.acao === 'revogar') {
    const ok = await revogarCodigo(kv, codigo)
    if (!ok) return res.status(404).json({ motivo: 'nao_encontrado', mensagem: 'Código não encontrado.' })
    return res.status(200).json({})
  }

  if (corpo?.acao === 'estender') {
    const dias = typeof corpo.dias === 'number' ? Math.trunc(corpo.dias) : NaN
    if (!Number.isInteger(dias) || dias === 0) {
      return res.status(400).json({ motivo: 'corpo_invalido', mensagem: '"dias" deve ser um inteiro diferente de zero.' })
    }
    const resultado = await estenderPrazo(kv, codigo, dias)
    if (!resultado.ok) {
      const mensagens: Record<string, string> = {
        codigo_invalido: 'Código não encontrado.',
        nao_ativado: 'Este código ainda não foi ativado por nenhum aluno — não há prazo para estender.',
      }
      const status = resultado.motivo === 'codigo_invalido' ? 404 : 409
      return res.status(status).json({ motivo: resultado.motivo, mensagem: mensagens[resultado.motivo] })
    }
    return res.status(200).json({ novoExpiraEm: resultado.novoExpiraEm })
  }

  return res.status(400).json({ motivo: 'corpo_invalido', mensagem: '"acao" deve ser "revogar" ou "estender".' })
}
