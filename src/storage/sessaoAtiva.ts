/**
 * Ponteiro para a "sessão de exame ativa" — qual `SessaoExame` recebe o próximo
 * "+ Adicionar à sessão" clicado numa calculadora ou protocolo, sem obrigar o aluno a
 * abrir a aba Sessão antes de calcular nada. É só um ponteiro (id), não dado clínico —
 * localStorage é apropriado aqui (mesmo raciocínio de "conveniência por aparelho" que
 * o resto do app já usa para preferências de UI, nunca para conteúdo).
 */
import { novaSessao, comEntrada } from './sessao'
import { obterSessao, salvarSessao } from './db'
import type { EntradaSessao, SessaoExame } from './tipos'

const CHAVE = 'tpocus:sessaoAtivaId'

export function obterSessaoAtivaId(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function definirSessaoAtivaId(id: string): void {
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // ambiente sem localStorage (ex.: alguns modos de navegação privada) — a sessão
    // ainda funciona, só não persiste qual é "a ativa" entre telas.
  }
}

/**
 * Adiciona uma entrada à sessão ativa, criando uma nova sessão se não houver uma
 * ativa ainda (ou se o ponteiro estiver "solto" — sessão excluída pelo aluno). Usado
 * pelos botões "+ Adicionar à sessão" das calculadoras e dos protocolos.
 */
export async function adicionarEntradaNaSessaoAtiva(entrada: EntradaSessao): Promise<SessaoExame> {
  const idAtivo = obterSessaoAtivaId()
  const existente = idAtivo ? await obterSessao(idAtivo) : undefined
  const sessao = existente ?? novaSessao()
  if (!existente) definirSessaoAtivaId(sessao.id)

  const atualizada = comEntrada(sessao, entrada)
  await salvarSessao(atualizada)
  return atualizada
}
