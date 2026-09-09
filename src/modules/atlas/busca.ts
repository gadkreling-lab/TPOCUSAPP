/**
 * Busca global (Fase 5) — função pura, sem React, para ser testável de forma isolada
 * (mesma filosofia de src/engine/*: lógica testável sem montar componente). Procura o
 * termo em windows/findings/pathologies/measurements/glossary ao mesmo tempo — o valor
 * de "busca global" é justamente não obrigar o aluno a saber em qual dos 5 arquivos do
 * content pack um termo vive.
 *
 * Só compara texto (nome/descrição/definição/etc.) contra a própria query — nunca filtra
 * nem reordena por relevância clínica, e não altera nenhum valor: é busca de texto, não
 * julgamento de conteúdo (CLAUDE.md Regra 1 não se aplica aqui, mas o espírito de "não
 * inventar" também vale: um item só aparece se o texto dele de fato contém a query).
 */
import type { Window, Finding, Pathology, Measurement, GlossaryEntry } from '../../content/types'

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove marcas diacríticas combinantes após NFD (acento-insensível)
    .toLowerCase()
}

function contem(campo: string | null | undefined, queryNormalizada: string): boolean {
  if (!campo) return false
  return normalizar(campo).includes(queryNormalizada)
}

function algumContem(campos: string[], queryNormalizada: string): boolean {
  return campos.some((c) => contem(c, queryNormalizada))
}

export interface FontesBusca {
  windows: Window[]
  findings: Finding[]
  pathologies: Pathology[]
  measurements: Measurement[]
  glossary: GlossaryEntry[]
}

export interface ResultadoBusca {
  windows: Window[]
  findings: Finding[]
  pathologies: Pathology[]
  measurements: Measurement[]
  glossary: GlossaryEntry[]
}

const RESULTADO_VAZIO: ResultadoBusca = { windows: [], findings: [], pathologies: [], measurements: [], glossary: [] }

export function buscar(query: string, fontes: FontesBusca): ResultadoBusca {
  const q = normalizar(query.trim())
  if (!q) return RESULTADO_VAZIO

  return {
    windows: fontes.windows.filter(
      (w) => contem(w.nome, q) || algumContem(w.estruturasVisualizadas, q) || algumContem(w.oQueAvaliar, q),
    ),
    findings: fontes.findings.filter((f) => contem(f.nome, q) || contem(f.descricao, q) || contem(f.significadoClinico, q)),
    pathologies: fontes.pathologies.filter((p) => contem(p.nome, q) || algumContem(p.achados, q)),
    measurements: fontes.measurements.filter((m) => contem(m.nome, q)),
    glossary: fontes.glossary.filter((g) => contem(g.sigla, q) || contem(g.termo, q) || contem(g.definicao, q)),
  }
}

export function totalResultados(r: ResultadoBusca): number {
  return r.windows.length + r.findings.length + r.pathologies.length + r.measurements.length + r.glossary.length
}
