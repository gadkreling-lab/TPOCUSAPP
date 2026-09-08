/**
 * Token de sessão de acesso — assinado (HMAC-SHA256), sem dependência externa (usa só
 * node:crypto). Não é JWT padrão porque não precisamos de negociação de algoritmo nem
 * de claims registradas — um formato mínimo reduz superfície.
 *
 * Formato: `<payload base64url>.<assinatura base64url>`
 *
 * Dois "tipos" de token, mesmo formato, TTLs diferentes (ver api/_lib/acesso.ts):
 *   'acesso'    — Bearer em toda chamada a /api/content/*, vida curta (≤15 min).
 *   'renovacao' — só para chamar /api/renovar; o próprio `exp` já é igual ao prazo
 *                 do aluno (`expiraEm`), então expira sozinho no dia certo mesmo sem
 *                 nenhuma checagem de KV.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type TipoSessao = 'acesso' | 'renovacao'

export interface SessionPayload {
  /** código de acesso ativado (não é PII) */
  codigo: string
  /** identificador do aparelho, gerado pelo cliente — não é PII */
  deviceId: string
  tipo: TipoSessao
  /** expiração, epoch em segundos */
  exp: number
}

function base64urlDoObjeto(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
}

export function assinarSessao(
  payload: Omit<SessionPayload, 'exp'>,
  segredo: string,
  ttlSegundos: number,
  agoraSegundos = Math.floor(Date.now() / 1000),
): string {
  const completo: SessionPayload = { ...payload, exp: agoraSegundos + ttlSegundos }
  const corpo = base64urlDoObjeto(completo)
  const assinatura = createHmac('sha256', segredo).update(corpo).digest('base64url')
  return `${corpo}.${assinatura}`
}

/** Verifica assinatura e expiração. Devolve o payload se válido, senão null. */
export function verificarSessao(token: string, segredo: string, agoraSegundos = Math.floor(Date.now() / 1000)): SessionPayload | null {
  const partes = token.split('.')
  if (partes.length !== 2) return null
  const [corpo, assinatura] = partes
  const esperada = createHmac('sha256', segredo).update(corpo).digest('base64url')

  const bufAssinatura = Buffer.from(assinatura)
  const bufEsperada = Buffer.from(esperada)
  if (bufAssinatura.length !== bufEsperada.length) return null
  if (!timingSafeEqual(bufAssinatura, bufEsperada)) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (
    typeof payload.exp !== 'number' ||
    typeof payload.codigo !== 'string' ||
    typeof payload.deviceId !== 'string' ||
    (payload.tipo !== 'acesso' && payload.tipo !== 'renovacao')
  ) {
    return null
  }
  if (payload.exp < agoraSegundos) return null
  return payload
}

/**
 * Lê TOKEN_SECRET do ambiente. Lança erro claro se ausente — nunca cai para um
 * segredo padrão em código (isso tornaria todo token forjável). Chame isto só dentro
 * dos handlers de api/, nunca em código de teste (os testes passam o segredo deles).
 */
export function segredoDoAmbiente(): string {
  const s = process.env.TOKEN_SECRET
  if (!s || s.length < 16) {
    throw new Error(
      'TOKEN_SECRET ausente ou curto demais. Defina uma variável de ambiente TOKEN_SECRET (≥16 caracteres, aleatória) no Vercel antes do deploy.',
    )
  }
  return s
}
