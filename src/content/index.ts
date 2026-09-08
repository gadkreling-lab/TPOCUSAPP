/**
 * Carregamento e consultas do content pack TPOCUS.
 * Agnóstico de framework — funciona em Vite, Next, React Native (com bundler de JSON).
 *
 * Leia CLAUDE.md antes de alterar qualquer JSON deste diretório.
 */

import windowsRaw from './windows.json'
import findingsRaw from './findings.json'
import pathologiesRaw from './pathologies.json'
import measurementsRaw from './measurements.json'
import glossaryRaw from './glossary.json'
import referencesRaw from './references.json'
import protocolsRaw from './protocols.json'
import imagesRaw from './images.json'
import correctionsRaw from './corrections.json'

import type {
  Window, Finding, Pathology, Measurement, GlossaryEntry,
  ReferenceChapter, Protocol, ImagemEbook, Correcao, FonteExterna,
} from './types'

export * from './types'

export const windows = windowsRaw as unknown as Window[]
export const findings = findingsRaw as unknown as Finding[]
export const pathologies = pathologiesRaw as unknown as Pathology[]
export const measurements = measurementsRaw as unknown as Measurement[]
export const glossary = glossaryRaw as unknown as GlossaryEntry[]
export const references = referencesRaw as unknown as ReferenceChapter[]
export const protocols = protocolsRaw as unknown as Protocol[]
export const images = imagesRaw as unknown as ImagemEbook[]
export const corrections = correctionsRaw as unknown as Correcao[]

// ------------------------------------------------------------ índices

const index = <T extends { id: string }>(arr: T[]) =>
  Object.fromEntries(arr.map(x => [x.id, x])) as Record<string, T>

export const windowsById = index(windows)
export const findingsById = index(findings)
export const pathologiesById = index(pathologies)
export const measurementsById = index(measurements)
export const glossaryById = index(glossary)
export const protocolsById = index(protocols)
export const imagesById = index(images)

// ------------------------------------------------------- relacionamentos

/** Achados citados por uma patologia. */
export const achadosDaPatologia = (p: Pathology): Finding[] =>
  p.findingsRelacionados.map(id => findingsById[id]).filter(Boolean)

/** Janela(s) de aquisição de uma medida. Trata o caso composto ("id-a + id-b"). */
export const janelasDaMedida = (m: Measurement): Window[] =>
  (m.janela ?? '')
    .split('+')
    .map(s => windowsById[s.trim()])
    .filter(Boolean)

/** Medidas adquiridas em uma janela. */
export const medidasDaJanela = (w: Window): Measurement[] =>
  measurements.filter(m => janelasDaMedida(m).some(j => j.id === w.id))

type ChaveImagem = 'windowIds' | 'findingIds' | 'measurementIds' | 'pathologyIds' | 'protocolIds'

/** Figuras vinculadas a um item. Ex.: imagensDe('findingIds', 'lung-point') */
export const imagensDe = (chave: ChaveImagem, id: string): ImagemEbook[] =>
  images.filter(im => im[chave].includes(id))

/** Caminho da figura. Ajuste conforme onde seu bundler serve os assets. */
export const caminhoImagem = (im: ImagemEbook) => `/content/images/${im.arquivo}`

/** Legenda a exibir: a do ebook quando existe, senão o título da seção. */
export const legendaDe = (im: ImagemEbook) => im.legendaEbook ?? im.secaoEbook

// ------------------------------------------------------- fonte externa

type ComFonte = { fonteExterna?: FonteExterna } & Record<string, unknown>

/**
 * Diz se um campo daquele item veio de fora do ebook.
 * A UI DEVE sinalizar esses campos ao usuário — ver CLAUDE.md, Regra 2.
 */
export const veioDeFora = (item: ComFonte, campo: string): boolean =>
  (item.fonteExterna?.campos ?? []).some(c => c.split(' ')[0] === campo)

/** Fonte a citar para um campo externo, ou null se o campo é do ebook. */
export const fonteDoCampo = (item: ComFonte, campo: string): FonteExterna | null =>
  veioDeFora(item, campo) ? item.fonteExterna! : null

/** Todos os itens do pacote que contêm conteúdo de fonte externa. */
export const itensComFonteExterna = () => [
  ...windows.filter(x => x.fonteExterna),
  ...findings.filter(x => x.fonteExterna),
  ...glossary.filter(x => x.fonteExterna),
  ...protocols.filter(x =>
    x.perfisFonteExterna || x.pontosBlueFonteExterna || x.regrasDecisaoFonteExterna),
]

// ------------------------------------------------------------- consultas

/** Posição do transdutor a exibir: a do ebook quando existe, senão a da fonte externa. */
export const posicaoTransdutorDe = (w: Window) =>
  w.posicaoTransdutor ?? w.posicaoTransdutorDetalhada ?? null

export const janelasPorCategoria = (c: Window['categoria']) =>
  windows.filter(w => w.categoria === c)

export const achadosPorModo = (m: Finding['modo']) =>
  findings.filter(f => f.modo === m)

/** Busca simples em nome, sigla, descrição e termos. Suficiente para um índice local. */
export const buscar = (q: string) => {
  const t = q.trim().toLowerCase()
  if (!t) return { windows: [], findings: [], measurements: [], glossary: [] }
  const tem = (...campos: (string | null | undefined)[]) =>
    campos.some(c => c?.toLowerCase().includes(t))
  return {
    windows: windows.filter(w => tem(w.nome, w.id)),
    findings: findings.filter(f => tem(f.nome, f.descricao, f.significadoClinico)),
    measurements: measurements.filter(m => tem(m.nome, m.id)),
    glossary: glossary.filter(g => tem(g.sigla, g.termo, g.definicao)),
  }
}

/** Todas as páginas do ebook citadas por um item — para o link "ver no ebook". */
export const paginasDe = (item: { paginaEbook: number; paginasEbook?: number[] }) =>
  item.paginasEbook ?? [item.paginaEbook]
