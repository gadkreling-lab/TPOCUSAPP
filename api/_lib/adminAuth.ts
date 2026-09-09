/**
 * Auth da tela administrativa (Fase 7) — senha de administrador separada dos códigos
 * de aluno (ARQUITETURA.md §6, "Geração e revogação de códigos"), guardada só em
 * variável de ambiente, nunca no código-fonte. Deliberadamente mais simples que o
 * fluxo de sessão do aluno: não é um token assinado com TTL, é uma senha comparada em
 * tempo constante a cada requisição — não guarda estado nenhum no servidor, e uma
 * senha errada não revela nada sobre o motivo (tempo de resposta constante, mensagem
 * genérica).
 */
import { timingSafeEqual } from 'node:crypto'
import { extrairBearer, type RequisicaoComAuth } from './bearer'

export type { RequisicaoComAuth }

export function segredoAdminDoAmbiente(): string {
  // .trim(): o campo "Value" do Vercel (Environment Variables) é uma textarea
  // multi-linha — um Enter/Tab acidental ao colar ou editar o valor vira um \n ou
  // espaço no fim da string, e a comparação de tamanho em compararSeguro rejeitaria
  // isso silenciosamente (sempre "senha incorreta", mesmo com a senha certa digitada
  // certa na tela de login). Espaço/quebra de linha não é um caractere válido de
  // senha aqui, então remover das duas pontas é seguro.
  const s = process.env.ADMIN_PASSWORD?.trim()
  if (!s || s.length < 8) {
    throw new Error(
      'ADMIN_PASSWORD ausente ou curta demais. Defina uma variável de ambiente ADMIN_PASSWORD (≥8 caracteres, aleatória) no Vercel antes do deploy.',
    )
  }
  return s
}

export function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // Comprimentos diferentes já vazam pelo timing do timingSafeEqual (ele exige
  // buffers do mesmo tamanho) — comparar contra um buffer do MESMO tamanho de `b`
  // preenchido com `a` (truncado/reaproveitado) mantém o tempo constante mesmo
  // quando os tamanhos não batem, sem afirmar nada sobre qual é maior.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(Buffer.alloc(bufB.length), Buffer.alloc(bufB.length))
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/** true se o Bearer da requisição bate com ADMIN_PASSWORD. */
export function autenticarAdmin(req: RequisicaoComAuth): boolean {
  const senha = extrairBearer(req)
  if (!senha) return false
  try {
    return compararSeguro(senha, segredoAdminDoAmbiente())
  } catch {
    // ADMIN_PASSWORD ausente no ambiente — falha fechada, nunca autentica sem segredo
    return false
  }
}
