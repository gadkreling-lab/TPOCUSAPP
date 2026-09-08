/**
 * Abstração de armazenamento chave-valor para o controle de acesso.
 * Ver ARQUITETURA.md §6.
 *
 * Em produção: Upstash Redis via integração do Vercel Marketplace, acessado pelo
 * client REST `@upstash/redis` (o pacote `@vercel/kv` original está descontinuado —
 * a Vercel migrou o KV gerenciado para Upstash direto; a interface abaixo isola essa
 * escolha, então trocar de novo o provedor não deve tocar em api/ativar.ts etc).
 *
 * Em dev/teste, sem as variáveis de ambiente do Upstash configuradas: cai para
 * MemoryKV, um Map em memória. MemoryKV NÃO É ADEQUADO PARA PRODUÇÃO — cada instância
 * de função serverless pode rodar em processo isolado, então o estado não persiste
 * nem é compartilhado entre requisições reais. Serve só para `npm test` e dev local.
 */

export interface KVStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

export class MemoryKV implements KVStore {
  private mapa = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | null> {
    return (this.mapa.has(key) ? (this.mapa.get(key) as T) : null)
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.mapa.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.mapa.delete(key)
  }

  /** Só para testes — não faz parte da interface KVStore. */
  clear(): void {
    this.mapa.clear()
  }
}

let instanciaMemoria: MemoryKV | null = null

/**
 * Devolve o KVStore a usar: Upstash Redis se as variáveis de ambiente existirem,
 * senão um MemoryKV compartilhado (mesma instância em todo o processo, para o estado
 * sobreviver entre chamadas dentro de uma mesma execução de teste/dev).
 */
export async function getKVStore(): Promise<KVStore> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

  if (url && token) {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({ url, token })
    return {
      async get<T>(key: string) {
        const v = await redis.get<T>(key)
        return v ?? null
      },
      async set<T>(key: string, value: T) {
        await redis.set(key, value as never)
      },
      async delete(key: string) {
        await redis.del(key)
      },
    }
  }

  if (!instanciaMemoria) instanciaMemoria = new MemoryKV()
  return instanciaMemoria
}
