/**
 * Persistência de verdade da sessão de exame — IndexedDB via `idb`. Único uso de
 * IndexedDB no app (ARQUITETURA.md §4): dado gerado pelo aluno, nunca conteúdo do
 * curso, então funciona 100% offline e não passa pelo gate de DRM do §6.
 *
 * Este arquivo não é coberto por teste unitário (não há IndexedDB em `node`, ambiente
 * do vitest deste projeto) — a lógica que de fato precisa de teste já foi extraída
 * para src/storage/sessao.ts (puro). Aqui só sobra o CRUD fino contra o `idb`.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SessaoExame } from './tipos'

interface TpocusDB extends DBSchema {
  sessoes: {
    key: string
    value: SessaoExame
    indexes: { atualizadoEm: string }
  }
}

const NOME_DB = 'tpocus-sessoes'
const VERSAO_DB = 1
const STORE = 'sessoes'

let dbPromise: Promise<IDBPDatabase<TpocusDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TpocusDB>(NOME_DB, VERSAO_DB, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('atualizadoEm', 'atualizadoEm')
      },
    })
  }
  return dbPromise
}

export async function salvarSessao(sessao: SessaoExame): Promise<void> {
  const db = await getDb()
  await db.put(STORE, sessao)
}

/** Mais recente primeiro (por `atualizadoEm`). */
export async function listarSessoes(): Promise<SessaoExame[]> {
  const db = await getDb()
  const todas = await db.getAll(STORE)
  return todas.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
}

export async function obterSessao(id: string): Promise<SessaoExame | undefined> {
  const db = await getDb()
  return db.get(STORE, id)
}

export async function excluirSessao(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
