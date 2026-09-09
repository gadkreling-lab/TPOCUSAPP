/**
 * Middleware fino para os endpoints de conteúdo (api/content/*): extrai e valida o
 * token de ACESSO do cabeçalho Authorization. Não lê o KV — a validação de token de
 * acesso é só assinatura + expiração (rápida, sem round-trip), de propósito: é isso
 * que torna viável checar em toda requisição de conteúdo. A revogação/expiração do
 * PRAZO do aluno é aplicada quando o token de acesso (curto) precisa ser renovado via
 * api/renovar.ts, que aí sim consulta o KV. Ver ARQUITETURA.md §6.
 */
import { segredoDoAmbiente } from './token'
import { verificarTokenAcesso } from './acesso'
import type { SessionPayload } from './token'
import { extrairBearer, type RequisicaoComAuth } from './bearer'

export type { RequisicaoComAuth }

/** Devolve o payload da sessão se o Bearer for um token de acesso válido, senão null. */
export function autenticarRequisicao(req: RequisicaoComAuth): SessionPayload | null {
  const token = extrairBearer(req)
  if (!token) return null
  try {
    return verificarTokenAcesso(token, segredoDoAmbiente())
  } catch {
    // TOKEN_SECRET ausente no ambiente — falha fechada, nunca autentica sem segredo
    return null
  }
}
