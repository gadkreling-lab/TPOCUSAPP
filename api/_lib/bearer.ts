/** Extração do cabeçalho `Authorization: Bearer <token>` — usado tanto pelo token de
 *  acesso do aluno (api/_lib/auth.ts) quanto pela senha de administrador
 *  (api/_lib/adminAuth.ts). São dois segredos diferentes; só a extração é comum. */
export interface RequisicaoComAuth {
  headers: { authorization?: string | undefined } | Record<string, string | string[] | undefined>
}

export function extrairBearer(req: RequisicaoComAuth): string | null {
  const h = (req.headers as Record<string, string | string[] | undefined>)['authorization']
  const valor = Array.isArray(h) ? h[0] : h
  if (!valor || !valor.startsWith('Bearer ')) return null
  return valor.slice('Bearer '.length).trim()
}
