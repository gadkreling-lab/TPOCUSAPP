/**
 * A senha de administrador digitada fica em `sessionStorage` (não `localStorage`) —
 * some quando a aba fecha, em vez de ficar indefinidamente num aparelho compartilhado
 * da operação do curso. Não é um token assinado: o servidor recompara a senha em cada
 * chamada (api/_lib/adminAuth.ts) — ver ARQUITETURA.md §6.
 */
const CHAVE = 'tpocus:adminSenha'

export function obterSenhaAdmin(): string | null {
  try {
    return sessionStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function definirSenhaAdmin(senha: string): void {
  try {
    sessionStorage.setItem(CHAVE, senha)
  } catch {
    // ambiente sem sessionStorage — a sessão administrativa não persiste entre
    // navegações, mas a tela ainda funciona dentro da mesma renderização.
  }
}

export function limparSenhaAdmin(): void {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // nada a limpar
  }
}
