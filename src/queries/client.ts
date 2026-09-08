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
      resp = await fetch(`/api/content/${recurso}`, { headers: { Authorization: `Bearer ${token}` } })
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

    const dados = (await resp.json()) as T
    guardarNoCache(recurso, dados)
    return dados
  })
}
