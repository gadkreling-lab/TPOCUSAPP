/**
 * Handler genérico para os endpoints de conteúdo JSON (api/content/*.ts) — cada um só
 * declara qual array de dados servir. Exige token de acesso válido em toda chamada;
 * isso é o que faz o controle de acesso valer para CADA tela, não só na abertura do
 * app. Ver ARQUITETURA.md §4 e §6.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { autenticarRequisicao } from './auth'

export function criarHandlerConteudo<T>(dados: T) {
  return function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use GET.' })
    }
    const sessao = autenticarRequisicao(req)
    if (!sessao) {
      return res.status(401).json({ motivo: 'nao_autenticado', mensagem: 'Sessão ausente, inválida ou expirada.' })
    }
    // Cache só no navegador durante a sessão em memória do app (ver src/queries/) —
    // nunca em disco. no-store impede qualquer cache HTTP intermediário/persistente.
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(dados)
  }
}
