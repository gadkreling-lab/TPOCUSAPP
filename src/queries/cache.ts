// Cache de conteúdo clínico EM MEMÓRIA, por sessão de app aberto — nunca em disco.
// Fechar a aba/app apaga isto (é um Map de módulo, recriado a cada carregamento do
// bundle). Não confundir com src/auth/sessionStore.ts, que persiste a CREDENCIAL
// (não é conteúdo do curso) — ver ARQUITETURA.md §4.
const cache = new Map<string, unknown>()
const emVoo = new Map<string, Promise<unknown>>()

export function obterDoCache<T>(chave: string): T | undefined {
  return cache.get(chave) as T | undefined
}

export function guardarNoCache<T>(chave: string, valor: T): void {
  cache.set(chave, valor)
}

/** Deduplica requisições concorrentes para a mesma chave (duas telas pedindo o mesmo recurso ao mesmo tempo). */
export function buscarComDeduplicacao<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  const existente = emVoo.get(chave)
  if (existente) return existente as Promise<T>
  const promessa = buscar().finally(() => emVoo.delete(chave))
  emVoo.set(chave, promessa)
  return promessa
}

/** Limpa tudo — chamado ao encerrar a sessão (logout, expiração). */
export function limparCacheDeConteudo(): void {
  cache.clear()
  emVoo.clear()
}
