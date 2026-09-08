/**
 * Lógica de controle de acesso — ativação, renovação, verificação de sessão.
 * Separado dos handlers HTTP (api/ativar.ts, api/renovar.ts) de propósito: essas
 * funções recebem um KVStore e valores já extraídos da requisição, e devolvem um
 * resultado tipado — dá para testar sem simular request/response HTTP nenhum.
 *
 * Modelo de dados e fluxo completos em ARQUITETURA.md §6.
 */
import type { KVStore } from './kv'
import { assinarSessao, verificarSessao, type SessionPayload } from './token'

export interface CodigoRecord {
  duracaoDias: number
  ativadoEm: number | null // epoch segundos
  expiraEm: number | null // epoch segundos = ativadoEm + duracaoDias * 86400
  deviceId: string | null
  ultimaRenovacaoEm: number | null
  revogado: boolean
}

const SEGUNDOS_POR_DIA = 86_400
const TTL_ACESSO_SEGUNDOS = 15 * 60

function chaveCodigo(codigo: string): string {
  return `codigo:${codigo}`
}

/** Cria um novo código de acesso não ativado. Usado pela tela administrativa (Fase 7). */
export async function criarCodigo(kv: KVStore, codigo: string, duracaoDias: number): Promise<void> {
  const registro: CodigoRecord = {
    duracaoDias,
    ativadoEm: null,
    expiraEm: null,
    deviceId: null,
    ultimaRenovacaoEm: null,
    revogado: false,
  }
  await kv.set(chaveCodigo(codigo), registro)
}

export async function revogarCodigo(kv: KVStore, codigo: string): Promise<boolean> {
  const registro = await kv.get<CodigoRecord>(chaveCodigo(codigo))
  if (!registro) return false
  await kv.set(chaveCodigo(codigo), { ...registro, revogado: true })
  return true
}

export interface SessaoEmitida {
  /** Bearer usado em toda chamada a /api/content/* — vida curta (~15 min). */
  tokenAcesso: string
  /**
   * Usado só para chamar /api/renovar. Vida longa, mas o próprio `exp` criptografado
   * já é igual a `expiraEm` do aluno — ele para de funcionar sozinho no prazo certo,
   * sem depender de checar o KV para isso (a checagem de KV cobre revogação e troca
   * de aparelho, que não dá para saber só pela assinatura).
   */
  tokenRenovacao: string
  expiraEm: number
}

export type ResultadoAtivacao =
  | { ok: true; sessao: SessaoEmitida }
  | { ok: false; motivo: 'codigo_invalido' | 'codigo_revogado' }

export async function ativarCodigo(
  kv: KVStore,
  segredo: string,
  codigo: string,
  deviceId: string,
  agora = Math.floor(Date.now() / 1000),
): Promise<ResultadoAtivacao> {
  const chave = chaveCodigo(codigo)
  const registro = await kv.get<CodigoRecord>(chave)
  if (!registro) return { ok: false, motivo: 'codigo_invalido' }
  if (registro.revogado) return { ok: false, motivo: 'codigo_revogado' }

  let atualizado: CodigoRecord
  if (registro.ativadoEm === null) {
    // primeira ativação — define o prazo individual do aluno a partir de agora
    const expiraEm = agora + registro.duracaoDias * SEGUNDOS_POR_DIA
    atualizado = { ...registro, ativadoEm: agora, expiraEm, deviceId, ultimaRenovacaoEm: agora }
  } else {
    // já ativado antes (mesmo aparelho ou transferência para um novo) — prazo não muda
    atualizado = { ...registro, deviceId, ultimaRenovacaoEm: agora }
  }
  await kv.set(chave, atualizado)

  const expiraEm = atualizado.expiraEm as number
  const sessao = emitirSessao(segredo, codigo, deviceId, expiraEm, agora)
  return { ok: true, sessao }
}

export type ResultadoRenovacao =
  | { ok: true; sessao: SessaoEmitida }
  | { ok: false; motivo: 'token_invalido' | 'codigo_revogado' | 'expirado' | 'aparelho_diferente' }

export async function renovarSessao(
  kv: KVStore,
  segredo: string,
  tokenRenovacao: string,
  agora = Math.floor(Date.now() / 1000),
): Promise<ResultadoRenovacao> {
  const payload = verificarSessao(tokenRenovacao, segredo, agora)
  if (!payload || payload.tipo !== 'renovacao') return { ok: false, motivo: 'token_invalido' }

  const registro = await kv.get<CodigoRecord>(chaveCodigo(payload.codigo))
  if (!registro || registro.expiraEm === null) return { ok: false, motivo: 'token_invalido' }
  if (registro.revogado) return { ok: false, motivo: 'codigo_revogado' }
  if (registro.deviceId !== payload.deviceId) return { ok: false, motivo: 'aparelho_diferente' }
  if (agora >= registro.expiraEm) return { ok: false, motivo: 'expirado' }

  await kv.set(chaveCodigo(payload.codigo), { ...registro, ultimaRenovacaoEm: agora })

  const sessao = emitirSessao(segredo, payload.codigo, payload.deviceId, registro.expiraEm, agora, {
    // não precisa reemitir o token de renovação: o exp dele já é expiraEm, fixo.
    somenteAcesso: true,
    tokenRenovacaoExistente: tokenRenovacao,
  })
  return { ok: true, sessao }
}

function emitirSessao(
  segredo: string,
  codigo: string,
  deviceId: string,
  expiraEm: number,
  agora: number,
  opcoes?: { somenteAcesso?: boolean; tokenRenovacaoExistente?: string },
): SessaoEmitida {
  const ttlAcesso = Math.max(1, Math.min(TTL_ACESSO_SEGUNDOS, expiraEm - agora))
  const tokenAcesso = assinarSessao({ codigo, deviceId, tipo: 'acesso' }, segredo, ttlAcesso, agora)
  const tokenRenovacao =
    opcoes?.somenteAcesso && opcoes.tokenRenovacaoExistente
      ? opcoes.tokenRenovacaoExistente
      : assinarSessao({ codigo, deviceId, tipo: 'renovacao' }, segredo, Math.max(1, expiraEm - agora), agora)
  return { tokenAcesso, tokenRenovacao, expiraEm }
}

/** Verifica um token de ACESSO (não de renovação) — usado pelos endpoints de conteúdo. */
export function verificarTokenAcesso(token: string, segredo: string, agora = Math.floor(Date.now() / 1000)): SessionPayload | null {
  const payload = verificarSessao(token, segredo, agora)
  if (!payload || payload.tipo !== 'acesso') return null
  return payload
}
