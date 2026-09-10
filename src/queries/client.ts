import { buscarComDeduplicacao, guardarNoCache, obterDoCache } from './cache'

export class ErroConteudo extends Error {
  constructor(
    public motivo: string,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

/**
 * Busca um recurso de conteúdo em /api/content/<recurso>, autenticado pelo token de
 * acesso corrente (renovado por `obterTokenAcesso` se preciso). Cacheia em memória por
 * sessão — chamadas repetidas ao mesmo recurso não refazem a requisição. Ver
 * ARQUITETURA.md §4.
 */
export async function buscarConteudo<T>(recurso: string, obterTokenAcesso: () => Promise<string | null>): Promise<T> {
  const doCache = obterDoCache<T>(recurso)
  if (doCache !== undefined) return doCache

  return buscarComDeduplicacao(recurso, async () => {
    const token = await obterTokenAcesso()
    if (!token) {
      throw new ErroConteudo('nao_autenticado', 'Sessão expirada. Ative seu código de acesso novamente.')
    }

    let resp: Response
    try {
      // cache: 'no-store' + parâmetro _ aleatório: além de nunca dever ser cacheado
      // (o endpoint já manda Cache-Control: no-store na resposta, ver
      // api/_lib/conteudo.ts), uma versão anterior do vercel.json deixou a borda da
      // Vercel guardar em cache a resposta ERRADA (o index.html do SPA) pra essa URL,
      // de antes de uma correção de rewrite — sem isso, o cache antigo continuava
      // sendo servido pra sempre, mesmo depois do bug corrigido, porque a requisição
      // nem chegava a sair do cache de borda pra função rodar de novo.
      resp = await fetch(`/api/content/${recurso}?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
    } catch {
      throw new ErroConteudo('sem_conexao', 'Verifique sua conexão e tente novamente.')
    }

    if (!resp.ok) {
      let corpo: { motivo?: string; mensagem?: string } = {}
      try {
        corpo = await resp.json()
      } catch {
        // resposta sem corpo JSON — segue com a mensagem genérica
      }
      throw new ErroConteudo(corpo.motivo ?? `http_${resp.status}`, corpo.mensagem ?? 'Não foi possível carregar o conteúdo.')
    }

    let dados: T
    try {
      dados = (await resp.json()) as T
    } catch {
      // resp.ok (200) mas corpo não é JSON válido — não deveria acontecer com os
      // endpoints deste app, mas sem este catch a exceção de parse escapava crua
      // daqui e virava o fallback genérico 'erro_desconhecido' lá em cima
      // (useConteudo.ts), escondendo que o problema era na resposta, não na rede
      // nem na sessão.
      throw new ErroConteudo('resposta_invalida', 'Resposta inesperada do servidor.')
    }
    guardarNoCache(recurso, dados)
    return dados
  })
}
