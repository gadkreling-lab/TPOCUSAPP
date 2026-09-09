/**
 * Lógica pura da sessão de exame — sem IndexedDB, sem React. Mesma filosofia dos
 * motores de calculadora/protocolo: testável sem montar componente nem abrir um banco.
 * A persistência de verdade fica em src/storage/db.ts.
 */
import type { ResultadoCalculado } from '../engine/calculator'
import type { NoConclusao } from '../content/protocol-flows/types'
import type { EntradaCalculadora, EntradaEvolucao, EntradaProtocolo, EntradaSessao, SessaoExame } from './tipos'

function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback só para ambientes sem crypto.randomUUID (ex.: alguns runners de teste) —
  // não é usado como identificador de segurança, só como chave local do IndexedDB.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const agoraISO = () => new Date().toISOString()

export function novaSessao(titulo = 'Sessão sem título', agora: () => string = agoraISO): SessaoExame {
  const ts = agora()
  return { id: gerarId(), titulo, criadoEm: ts, atualizadoEm: ts, entradas: [] }
}

export function comEntrada(sessao: SessaoExame, entrada: EntradaSessao, agora: () => string = agoraISO): SessaoExame {
  return { ...sessao, entradas: [...sessao.entradas, entrada], atualizadoEm: agora() }
}

export function semEntrada(sessao: SessaoExame, entradaId: string, agora: () => string = agoraISO): SessaoExame {
  return { ...sessao, entradas: sessao.entradas.filter((e) => e.id !== entradaId), atualizadoEm: agora() }
}

export function comTitulo(sessao: SessaoExame, titulo: string, agora: () => string = agoraISO): SessaoExame {
  return { ...sessao, titulo, atualizadoEm: agora() }
}

export function entradaCalculadora(
  calculadoraId: string,
  calculadoraNome: string,
  r: ResultadoCalculado,
  agora: () => string = agoraISO,
): EntradaCalculadora {
  return {
    tipo: 'calculadora',
    id: gerarId(),
    criadoEm: agora(),
    calculadoraId,
    calculadoraNome,
    resultadoId: r.id,
    label: r.label,
    valor: r.valor,
    unidade: r.unidade,
    texto: r.texto,
    severidade: r.tipo === 'classificado' ? r.severidade : undefined,
    origem: r.origem,
  }
}

export function entradaProtocolo(
  protocoloId: string,
  protocoloNome: string,
  no: NoConclusao,
  agora: () => string = agoraISO,
): EntradaProtocolo {
  return {
    tipo: 'protocolo',
    id: gerarId(),
    criadoEm: agora(),
    protocoloId,
    protocoloNome,
    diagnostico: no.diagnostico,
    confianca: no.confianca,
    justificativa: no.justificativa,
    proximosPassos: no.proximosPassos,
    cuidado: no.cuidado,
  }
}

export function entradaEvolucao(texto: string, agora: () => string = agoraISO): EntradaEvolucao {
  return { tipo: 'evolucao', id: gerarId(), criadoEm: agora(), texto }
}
