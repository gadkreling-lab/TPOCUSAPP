/**
 * Motor de protocolo — máquina de estados pura, sem conhecimento de BLUE/RUSH/E-FAST
 * especificamente (o mesmo motor genérico percorre qualquer `ProtocolFlow`). Ver
 * ARQUITETURA.md §3.1.
 */
import type { ProtocolFlow, NoProtocolo } from '../../content/protocol-flows/types'

export interface TrilhaItem {
  /** id do nó de pergunta que foi respondido (o "antes" da escolha). */
  noId: string
  escolhaLabel: string
  /** id do nó para o qual essa escolha levou (o "depois"). */
  escolhaProximo: string
  timestamp: string
}

export interface ProtocolState {
  protocoloId: string
  noAtual: string
  /**
   * Pilha de passos já respondidos — é a fonte de verdade de `voltar`. `voltar` nunca
   * recalcula o grafo a partir do zero: ele desempilha o último passo e volta o
   * `noAtual` para o `noId` gravado ali, para que o aluno possa corrigir uma resposta
   * sem efeitos colaterais em nada além da própria trilha.
   */
  trilha: TrilhaItem[]
}

/** Ponto inicial de uma sessão de protocolo, no `noInicial` do flow. */
export function iniciar(protocoloId: string, noInicial: string): ProtocolState {
  return { protocoloId, noAtual: noInicial, trilha: [] }
}

/** Reinicia do zero — mesmo protocolo, trilha zerada. */
export function reiniciar(protocoloId: string, noInicial: string): ProtocolState {
  return iniciar(protocoloId, noInicial)
}

/** Empilha a escolha feita no nó atual e avança para o nó de destino. */
export function avancar(
  state: ProtocolState,
  opcaoEscolhida: { label: string; proximo: string },
  agora: () => string = () => new Date().toISOString(),
): ProtocolState {
  const passo: TrilhaItem = {
    noId: state.noAtual,
    escolhaLabel: opcaoEscolhida.label,
    escolhaProximo: opcaoEscolhida.proximo,
    timestamp: agora(),
  }
  return { ...state, noAtual: opcaoEscolhida.proximo, trilha: [...state.trilha, passo] }
}

/**
 * Desfaz o último passo. Não recalcula nada do grafo — só desempilha a trilha e
 * devolve `noAtual` para o `noId` do passo removido. Sem efeito se a trilha já está
 * vazia (já está no `noInicial`).
 */
export function voltar(state: ProtocolState): ProtocolState {
  if (state.trilha.length === 0) return state
  const ultimo = state.trilha[state.trilha.length - 1]
  return { ...state, noAtual: ultimo.noId, trilha: state.trilha.slice(0, -1) }
}

export function noAtualObjeto(state: ProtocolState, flow: ProtocolFlow): NoProtocolo | undefined {
  return flow.nos[state.noAtual]
}

export function estaConcluido(state: ProtocolState, flow: ProtocolFlow): boolean {
  return noAtualObjeto(state, flow)?.tipo === 'conclusao'
}

/**
 * Profundidade (nº de perguntas) até cada nó de conclusão alcançável a partir do
 * `noInicial`, percorrendo o grafo. Usado só para a heurística de progresso — não é
 * uma trilha de execução real, por isso pode enumerar todos os ramos.
 *
 * `caminho` (visitados NO CAMINHO ATUAL, não global) evita loop infinito no caso
 * (não esperado no conteúdo real) de um ciclo no grafo, sem impedir que ramos
 * diferentes voltem a passar por um nó compartilhado (ex.: um "indeterminado" que cai
 * de volta numa pergunta comum).
 */
function profundidadesAteConclusao(flow: ProtocolFlow): number[] {
  const profundidades: number[] = []

  function dfs(noId: string, profundidade: number, caminho: ReadonlySet<string>) {
    if (caminho.has(noId)) return
    const no = flow.nos[noId]
    if (!no) return
    if (no.tipo === 'conclusao') {
      profundidades.push(profundidade)
      return
    }
    const novoCaminho = new Set(caminho)
    novoCaminho.add(noId)
    for (const opcao of no.opcoes) dfs(opcao.proximo, profundidade + 1, novoCaminho)
    dfs(no.indeterminadoProximo, profundidade + 1, novoCaminho)
  }

  dfs(flow.noInicial, 0, new Set())
  return profundidades
}

/**
 * Heurística de progresso (0 a 1): profundidade atual (nº de passos já respondidos) /
 * profundidade média até uma conclusão, no grafo inteiro. É só uma estimativa visual
 * para a barra de progresso — protocolos com ramos de tamanhos muito diferentes
 * (ex.: RUSH misto vs. um único achado claro) nunca teriam um "% exato" verdadeiro.
 */
export function progresso(state: ProtocolState, flow: ProtocolFlow): number {
  const profundidades = profundidadesAteConclusao(flow)
  if (profundidades.length === 0) return 0
  const media = profundidades.reduce((soma, p) => soma + p, 0) / profundidades.length
  if (media === 0) return 1
  return Math.min(state.trilha.length / media, 1)
}
