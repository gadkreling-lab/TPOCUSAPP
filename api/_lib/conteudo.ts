/**
 * Handler genérico para os endpoints de conteúdo JSON (api/content/*.ts) — cada um só
 * declara qual array de dados servir. Exige token de acesso válido em toda chamada;
 * isso é o que faz o controle de acesso valer para CADA tela, não só na abertura do
 * app. Ver ARQUITETURA.md §4 e §6.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { autenticarRequisicao } from './auth.js'

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

/**
 * Mesma coisa que criarHandlerConteudo, mas para vários recursos servidos por UMA
 * função só (api/conteudo.ts) em vez de um arquivo por recurso. Existe por
 * limite de plataforma, não de arquitetura: o plano Hobby da Vercel só permite 12
 * Serverless Functions por deploy, e este projeto passou disso com um arquivo por
 * endpoint de conteúdo. O cliente já chama tudo pelo mesmo padrão
 * `/api/conteudo?recurso=<recurso>` (src/queries/client.ts), então consolidar não muda
 * nada do lado de quem consome — só reduz a contagem de funções.
 */
export function criarHandlerConteudoDinamico(mapa: Record<string, unknown>) {
  return function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ motivo: 'metodo_nao_permitido', mensagem: 'Use GET.' })
    }
    const sessao = autenticarRequisicao(req)
    if (!sessao) {
      return res.status(401).json({ motivo: 'nao_autenticado', mensagem: 'Sessão ausente, inválida ou expirada.' })
    }
    const recurso = typeof req.query.recurso === 'string' ? req.query.recurso : ''
    if (!Object.prototype.hasOwnProperty.call(mapa, recurso)) {
      return res.status(404).json({ motivo: 'nao_encontrado', mensagem: 'Recurso de conteúdo não encontrado.' })
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(mapa[recurso])
  }
}
