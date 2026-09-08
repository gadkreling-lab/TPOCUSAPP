#!/usr/bin/env node
/**
 * Validação do content pack TPOCUS.
 *   node scripts/validate-content.mjs
 *
 * Roda em CI e antes de commitar. Falha (exit 1) se:
 *   - algum JSON não parseia ou tem id duplicado
 *   - algum enum tem valor fora do domínio
 *   - alguma chave estrangeira não resolve
 *   - falta campo obrigatório
 *   - uma imagem referenciada em images.json não existe em disco
 *   - um item com fonteExterna não declara `campos`
 *
 * NÃO valida o conteúdo clínico — ver CLAUDE.md, Regra 1: valores do ebook
 * não se alteram, e nenhum script pode julgar isso por você.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')
const load = f => JSON.parse(readFileSync(join(DIR, f), 'utf8'))

const erros = []
const avisos = []
const err = (...m) => erros.push(m.join(' '))
const warn = (...m) => avisos.push(m.join(' '))

const FILES = ['windows', 'findings', 'pathologies', 'measurements',
               'glossary', 'references', 'protocols', 'images', 'corrections']
const d = {}
for (const f of FILES) {
  try { d[f] = load(`${f}.json`) } catch (e) { err(`${f}.json não parseia:`, e.message); }
}
if (erros.length) { console.error(erros.join('\n')); process.exit(1) }

// ---- ids únicos
for (const f of ['windows', 'findings', 'pathologies', 'measurements', 'glossary', 'protocols', 'images']) {
  const ids = d[f].map(x => x.id)
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
  if (dup.length) err(`${f}.json: ids duplicados:`, [...new Set(dup)].join(', '))
  if (ids.some(x => !x)) err(`${f}.json: item sem id`)
}

// ---- enums
const CATEGORIA = ['cardiaca', 'pulmonar', 'vascular', 'abdominal']
const MODO = ['B', 'M', 'Doppler']
const TRANSDUTOR = ['setorial', 'linear', 'convexo', null]
const CAT_GLOS = ['geral', 'cardiaca', 'pulmonar', 'vascular', 'medida', 'protocolo']
const CAT_IMG = [...CATEGORIA, 'medida', 'protocolo']

for (const w of d.windows) {
  if (!CATEGORIA.includes(w.categoria)) err(`windows/${w.id}: categoria inválida "${w.categoria}"`)
  if (!TRANSDUTOR.includes(w.transdutor)) err(`windows/${w.id}: transdutor inválido "${w.transdutor}"`)
}
for (const x of [...d.findings, ...d.measurements])
  if (!MODO.includes(x.modo)) err(`${x.id}: modo inválido "${x.modo}"`)
for (const g of d.glossary)
  if (!CAT_GLOS.includes(g.categoria)) err(`glossary/${g.id}: categoria inválida "${g.categoria}"`)
for (const im of d.images) {
  if (!CAT_IMG.includes(im.categoria)) err(`images/${im.id}: categoria inválida "${im.categoria}"`)
  if (im.formato !== 'webp') err(`images/${im.id}: formato inesperado "${im.formato}"`)
}

// ---- campos obrigatórios
const OBRIG = {
  windows: ['id','nome','categoria','transdutor','posicaoPaciente','posicaoTransdutor',
            'marcador','estruturasVisualizadas','comoOtimizar','errosComuns','oQueAvaliar','paginaEbook'],
  findings: ['id','nome','modo','descricao','significadoClinico','diagnosticosAssociados','armadilhas','paginaEbook'],
  pathologies: ['id','nome','achados','findingsRelacionados','paginaEbook'],
  measurements: ['id','nome','janela','modo','passosAquisicao','formula','unidades',
                 'referencias','armadilhas','prerequisitos','paginaEbook'],
  glossary: ['id','sigla','termo','definicao','categoria','paginaEbook'],
  images: ['id','arquivo','paginaEbook','figuraNumero','legendaEbook','secaoEbook','categoria'],
}
for (const [f, campos] of Object.entries(OBRIG))
  for (const x of d[f])
    for (const c of campos)
      if (!(c in x)) err(`${f}/${x.id}: falta o campo obrigatório "${c}"`)

// ---- páginas
for (const f of FILES)
  for (const x of d[f]) {
    const p = x.paginaEbook
    if (p != null && !(Number.isInteger(p) && p >= 1 && p <= 96))
      err(`${f}/${x.id ?? x.capituloId}: paginaEbook fora de 1-96 (${p})`)
    if (x.paginasEbook && !x.paginasEbook.every(n => Number.isInteger(n) && n >= 1 && n <= 96))
      err(`${f}/${x.id}: paginasEbook com valor fora de 1-96`)
  }

// ---- chaves estrangeiras
const setOf = f => new Set(d[f].map(x => x.id))
const S = { windows: setOf('windows'), findings: setOf('findings'), measurements: setOf('measurements'),
            pathologies: setOf('pathologies'), protocols: setOf('protocols') }

for (const p of d.pathologies)
  for (const r of p.findingsRelacionados ?? [])
    if (!S.findings.has(r)) err(`pathologies/${p.id}: findingsRelacionados aponta para "${r}" (inexistente)`)

for (const m of d.measurements)
  for (const j of String(m.janela ?? '').split('+').map(s => s.trim()).filter(Boolean))
    if (!S.windows.has(j)) err(`measurements/${m.id}: janela aponta para "${j}" (inexistente)`)

const MAP = { windowIds: 'windows', findingIds: 'findings', measurementIds: 'measurements',
              pathologyIds: 'pathologies', protocolIds: 'protocols' }
for (const im of d.images)
  for (const [k, alvo] of Object.entries(MAP))
    for (const v of im[k] ?? [])
      if (!S[alvo].has(v)) err(`images/${im.id}: ${k} aponta para "${v}" (inexistente)`)

for (const pr of d.protocols)
  for (const j of pr.janelas ?? [])
    if (!S.windows.has(j)) err(`protocols/${pr.id}: janelas aponta para "${j}" (inexistente)`)

for (const w of d.windows)
  for (const v of w.verTambem ?? [])
    if (!S.windows.has(v)) err(`windows/${w.id}: verTambem aponta para "${v}" (inexistente)`)

// ---- imagens em disco
const IMGDIR = join(DIR, 'images')
const emDisco = existsSync(IMGDIR) ? new Set(readdirSync(IMGDIR)) : new Set()
for (const im of d.images)
  if (!emDisco.has(im.arquivo)) err(`images/${im.id}: arquivo "${im.arquivo}" não existe em src/content/images/`)
const referenciadas = new Set(d.images.map(x => x.arquivo))
for (const f of emDisco)
  if (!referenciadas.has(f)) warn(`imagem órfã em disco (não está em images.json): ${f}`)

// ---- fonte externa
let nExternos = 0
for (const f of FILES)
  for (const x of d[f])
    for (const [k, v] of Object.entries(x)) {
      if (k !== 'fonteExterna' && !k.endsWith('FonteExterna')) continue
      nExternos++
      if (!v?.referencia) err(`${f}/${x.id}: ${k} sem "referencia"`)
      if (!Array.isArray(v?.campos) || !v.campos.length)
        err(`${f}/${x.id}: ${k} sem "campos" — não dá para saber o que veio de fora`)
    }

// ---- relatório
const N = f => `${f}.json`.padEnd(20) + String(d[f].length).padStart(4)
console.log('Content pack TPOCUS\n' + FILES.map(N).join('\n'))
console.log(`\nitens com fonte externa: ${nExternos}`)
console.log(`imagens: ${d.images.length} (${(d.images.reduce((a, x) => a + (x.bytes ?? 0), 0) / 1e6).toFixed(1)} MB)`)

if (avisos.length) console.warn('\nAvisos:\n  ' + avisos.join('\n  '))
if (erros.length) { console.error(`\n✗ ${erros.length} erro(s):\n  ` + erros.join('\n  ')); process.exit(1) }
console.log('\n✓ conteúdo válido')
