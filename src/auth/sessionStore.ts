// Persistência local da sessão de acesso — NÃO é conteúdo clínico (é só um par de
// tokens de credencial, análogo a "lembrar login" de qualquer app), então guardar em
// localStorage não fere a regra de DRM da seção 4 do ARQUITETURA.md: o que não pode
// persistir é o conteúdo do curso (JSON/imagens), não a credencial de acesso.
export interface SessaoPersistida {
  tokenAcesso: string
  tokenRenovacao: string
  expiraEm: number // epoch segundos
}

const CHAVE = 'tpocus.sessao'

export function salvarSessao(s: SessaoPersistida): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(s))
  } catch {
    // sem persistência: a sessão vive só em memória para esta carga da página
  }
}

export function carregarSessao(): SessaoPersistida | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Partial<SessaoPersistida>
    if (typeof s.tokenAcesso !== 'string' || typeof s.tokenRenovacao !== 'string' || typeof s.expiraEm !== 'number') {
      return null
    }
    return s as SessaoPersistida
  } catch {
    return null
  }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // nada a fazer
  }
}

/**
 * Lê o campo `exp` de um token sem verificar a assinatura — o cliente não tem o
 * segredo, então isto é só uma heurística para decidir se vale a pena tentar usar o
 * token sem renovar antes. A validade de verdade é sempre decidida pelo servidor
 * (api/_lib/token.ts, verificarSessao) em toda chamada real.
 */
export function expDoToken(token: string): number | null {
  const [corpo] = token.split('.')
  if (!corpo) return null
  try {
    let b64 = corpo.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4 !== 0) b64 += '='
    const payload = JSON.parse(atob(b64)) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}
