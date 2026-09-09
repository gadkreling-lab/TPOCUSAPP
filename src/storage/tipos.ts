/**
 * Tipos da Sessão de Exame (Módulo 4). Dado gerado pelo ALUNO — débito cardíaco
 * calculado, achados de protocolo, texto de evolução — nunca conteúdo do curso, então
 * nunca precisou ficar atrás do gate de DRM (ARQUITETURA.md §4). Vive só no aparelho
 * do aluno, em IndexedDB (src/storage/db.ts).
 */
import type { Severidade } from '../content/types'

export interface EntradaCalculadora {
  tipo: 'calculadora'
  id: string
  criadoEm: string
  calculadoraId: string
  calculadoraNome: string
  /** id do resultado dentro da calculadora (ex.: "debito-cardiaco") — rastreabilidade. */
  resultadoId: string
  label: string
  valor: number
  unidade: string
  texto: string
  /** ausente quando o resultado era 'aviso' ou 'nao_classificado' (não tem selo). */
  severidade?: Severidade
  origem: 'ebook' | 'complementar'
}

export interface EntradaProtocolo {
  tipo: 'protocolo'
  id: string
  criadoEm: string
  protocoloId: string
  protocoloNome: string
  /** string[] no caso de múltiplos perfis compatíveis (ex.: RUSH em choque misto). */
  diagnostico: string | string[]
  confianca: string
  justificativa: string
  proximosPassos: string[]
  cuidado: string
}

export interface EntradaEvolucao {
  tipo: 'evolucao'
  id: string
  criadoEm: string
  texto: string
}

export type EntradaSessao = EntradaCalculadora | EntradaProtocolo | EntradaEvolucao

export interface SessaoExame {
  id: string
  /** rótulo livre escolhido pelo aluno (ex.: "Leito 4") — nunca dado de identificação
   *  do paciente; a UI avisa sobre isso ao editar o título. */
  titulo: string
  criadoEm: string
  atualizadoEm: string
  entradas: EntradaSessao[]
}
