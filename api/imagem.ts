/**
 * GET /api/imagem?arquivo=<arquivo> — serve o binário de uma figura do ebook.
 *
 * NÃO é mais rota dinâmica com colchete (era api/content/images/[arquivo].ts) — ver
 * ARQUITETURA.md, "Quinta correção encontrada durante o deploy": rota estática de
 * nome fixo, `arquivo` vem de query string.
 *
 * `arquivo` é validado contra a lista de nomes conhecidos em images.json (nunca lido
 * direto do path da requisição) — evita qualquer tentativa de path traversal, mesmo
 * que a validação de forma abaixo já bastasse sozinha (nomes são sempre
 * `fig-p###-##.webp`).
 *
 * `with { type: 'json' }`: obrigatório em Node.js recente sob ESM nativo (a função
 * roda em Node.js 24.x na Vercel) — ver api/conteudo.ts pra explicação completa.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import catalogo from '../src/content/images.json' with { type: 'json' }
import { autenticarRequisicao } from './_lib/auth.js'

const ARQUIVOS_CONHECIDOS = new Set(catalogo.map((im) => im.arquivo))
const DIR_IMAGENS = join(process.cwd(), 'src', 'content', 'images')

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use GET.' })
  }
  const sessao = autenticarRequisicao(req)
  if (!sessao) {
    return res.status(401).json({ motivo: 'nao_autenticado', mensagem: 'Sessão ausente, inválida ou expirada.' })
  }

  const arquivo = typeof req.query.arquivo === 'string' ? req.query.arquivo : ''
  if (!ARQUIVOS_CONHECIDOS.has(arquivo)) {
    return res.status(404).json({ motivo: 'nao_encontrado', mensagem: 'Imagem não encontrada.' })
  }

  let bytes: Buffer
  try {
    bytes = readFileSync(join(DIR_IMAGENS, arquivo))
  } catch (e) {
    console.error(`imagem catalogada mas ausente em disco: ${arquivo}`, e)
    return res.status(404).json({ motivo: 'nao_encontrado', mensagem: 'Imagem não encontrada.' })
  }

  res.setHeader('Content-Type', 'image/webp')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(bytes)
}
