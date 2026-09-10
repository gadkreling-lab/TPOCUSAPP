/**
 * Lógica de controle de acesso — ativação, renovação, verificação de sessão.
 * Separado dos handlers HTTP (api/ativar.ts, api/renovar.ts) de propósito: essas
 * funções recebem um KVStore e valores já extraídos da requisição, e devolvem um
 * resultado tipado — dá para testar sem simular request/response HTTP nenhum.
 *
 * Modelo de dados e fluxo completos em ARQUITETURA.md §6.
 */
import type { KVStore } from './kv.js'
import { assinarSessao, verificarSessao, type SessionPayload } from './token.js'

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

/**
 * Índice de todos os códigos já criados — a interface `KVStore` só tem
 * get/set/delete por chave (nenhum "listar chaves por prefixo"), então a tela
 * administrativa (Fase 7) precisa de algo para listar. Um array em uma chave fixa é
 * simples e funciona igual em MemoryKV e Upstash Redis, sem exigir o comando KEYS do
 * Redis (evitado de propósito — não escala e não é recomendado em produção).
 */
const CHAVE_INDICE = 'codigos:indice'

async function adicionarAoIndice(kv: KVStore, codigo: string): Promise<void> {
  const indice = (await kv.get<string[]>(CHAVE_INDICE)) ?? []
  if (!indice.includes(codigo)) {
    indice.push(codigo)
    await kv.set(CHAVE_INDICE, indice)
  }
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
  await adicionarAoIndice(kv, codigo)
}

// Sem O/0, I/1/L — caracteres fáceis de confundir num código ditado ou digitado à
// mão pelo aluno.
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function gerarCodigoAleatorio(tamanho = 8): string {
  const bytes = new Uint8Array(tamanho)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < tamanho; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let codigo = ''
  for (let i = 0; i < tamanho; i++) codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length]
  return codigo
}

/**
 * Gera `quantidade` códigos novos e únicos, todos com a mesma `duracaoDias`. Usado
 * pela tela administrativa para gerar um lote de códigos de uma vez (ex.: uma turma
 * inteira). Cada código tenta no máximo 10 vezes evitar colisão com um já existente —
 * na prática, praticamente nunca disparado (8 caracteres num alfabeto de 32 símbolos).
 */
export async function criarCodigos(kv: KVStore, quantidade: number, duracaoDias: number): Promise<string[]> {
  const codigos: string[] = []
  for (let i = 0; i < quantidade; i++) {
    let codigo = gerarCodigoAleatorio()
    let tentativas = 0
    while ((await kv.get(chaveCodigo(codigo))) !== null && tentativas < 10) {
      codigo = gerarCodigoAleatorio()
      tentativas++
    }
    await criarCodigo(kv, codigo, duracaoDias)
    codigos.push(codigo)
  }
  return codigos
}

export type StatusCodigo = 'nao_ativado' | 'ativo' | 'expirado' | 'revogado'

export function statusCodigo(registro: CodigoRecord, agora = Math.floor(Date.now() / 1000)): StatusCodigo {
  if (registro.revogado) return 'revogado'
  if (registro.ativadoEm === null || registro.expiraEm === null) return 'nao_ativado'
  if (agora >= registro.expiraEm) return 'expirado'
  return 'ativo'
}

export interface CodigoComStatus extends CodigoRecord {
  codigo: string
  status: StatusCodigo
}

/** Lista todos os códigos já criados, com status calculado. Ordem: mais recente primeiro. */
export async function listarCodigos(kv: KVStore, agora = Math.floor(Date.now() / 1000)): Promise<CodigoComStatus[]> {
  const indice = (await kv.get<string[]>(CHAVE_INDICE)) ?? []
  const registros = await Promise.all(indice.map((codigo) => kv.get<CodigoRecord>(chaveCodigo(codigo))))
  const codigosComStatus: CodigoComStatus[] = []
  for (let i = 0; i < indice.length; i++) {
    const registro = registros[i]
    if (!registro) continue // defensivo — não deveria acontecer (índice e registro andam juntos)
    codigosComStatus.push({ codigo: indice[i], ...registro, status: statusCodigo(registro, agora) })
  }
  return codigosComStatus.reverse()
}

export type ResultadoExtensao = { ok: true; novoExpiraEm: number } | { ok: false; motivo: 'codigo_invalido' | 'nao_ativado' }

/**
 * Estende o prazo de um código JÁ ATIVADO em `dias` dias, a partir do `expiraEm`
 * atual (não a partir de agora — estender 30 dias de um código que já tinha 10 dias
 * restantes soma aos 10, não zera). Endereça a lacuna descrita em ARQUITETURA.md §6
 * ("Nota de implementação, Fase 1"): `duracaoDias` só valia no momento da ativação;
 * esta é a operação própria que faltava para mudar `expiraEm` depois.
 */
export async function estenderPrazo(kv: KVStore, codigo: string, dias: number): Promise<ResultadoExtensao> {
  const registro = await kv.get<CodigoRecord>(chaveCodigo(codigo))
  if (!registro) return { ok: false, motivo: 'codigo_invalido' }
  if (registro.expiraEm === null) return { ok: false, motivo: 'nao_ativado' }
  const novoExpiraEm = registro.expiraEm + dias * SEGUNDOS_POR_DIA
  await kv.set(chaveCodigo(codigo), { ...registro, expiraEm: novoExpiraEm })
  return { ok: true, novoExpiraEm }
}

export async function revogarCodigo(kv: KVStore, codigo: string): Promise<boolean> {
  const registro = await kv.get<CodigoRecord>(chaveCodigo(codigo))
  if (!registro) return false
  await kv.set(chaveCodigo(codigo), { ...registro, revogado: true })
  return true
}

export interface SessaoEmitida {
  /** Bearer usado em toda chamada a /api/conteudo e /api/imagem — vida curta (~15 min). */
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
