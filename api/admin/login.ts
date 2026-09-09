/**
 * POST /api/admin/login { senha: string }
 *
 * Só confirma se a senha bate — não emite token nenhum. O cliente guarda a própria
 * senha (em sessionStorage, não localStorage — ver src/admin/) e manda como Bearer em
 * toda chamada administrativa seguinte; cada uma é validada de novo, de forma
 * independente (api/_lib/adminAuth.ts). Isso existe só para dar feedback imediato de
 * "senha incorreta" na tela de login, em vez do aluno-administrador só descobrir ao
 * tentar listar códigos.
 *
 * Resposta 200: {} — senha correta.
 * Resposta 401: { motivo, mensagem } — senha incorreta ou ausente.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { compararSeguro, segredoAdminDoAmbiente } from '../_lib/adminAuth'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use POST.' })
  }

  const corpo = req.body as { senha?: unknown } | undefined
  const senha = typeof corpo?.senha === 'string' ? corpo.senha : ''

  let segredo: string
  try {
    segredo = segredoAdminDoAmbiente()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ motivo: 'erro_servidor', mensagem: 'Erro de configuração do servidor.' })
  }

  if (!compararSeguro(senha, segredo)) {
    return res.status(401).json({ motivo: 'senha_incorreta', mensagem: 'Senha incorreta.' })
  }
  return res.status(200).json({})
}
