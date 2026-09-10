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
 * Busca um recurso de conteúdo em /api/conteudo?recurso=<recurso>, autenticado pelo
 * token de acesso corrente (renovado por `obterTokenAcesso` se preciso). Cacheia em
 * memória por sessão — chamadas repetidas ao mesmo recurso não refazem a requisição.
 * Ver ARQUITETURA.md §4.
 *
 * `recurso` vai em query string, não em segmento de path dinâmico (`/api/content/x`
 * como era antes) — ver ARQUITETURA.md, "Quinta correção encontrada durante o deploy":
 * rota dinâmica com colchete nunca funcionou de forma confiável neste projeto na
 * Vercel.
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
      // cache: 'no-store' — o endpoint já manda Cache-Control: no-store na resposta
      // (api/_lib/conteudo.ts) e vercel.json também proíbe cache de borda em /api/*;
      // isso aqui é só reforço do lado do navegador, conteúdo autenticado nunca deve
      // ser servido de cache nenhum.
      resp = await fetch(`/api/conteudo?recurso=${encodeURIComponent(recurso)}`, {
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
