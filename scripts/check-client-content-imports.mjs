#!/usr/bin/env node
/**
 * Guarda de build: nenhum código do CLIENTE pode importar src/content/*.json nem
 * src/content/index.ts (que importa os JSONs). Conteúdo clínico é servido sob demanda
 * por api/content/*, autenticado — nunca vai para o bundle do cliente. Ver
 * ARQUITETURA.md §4.
 *
 * Qualquer arquivo "types" dentro de content/, em qualquer subpasta, é seguro e
 * PERMITIDO no cliente (é só tipos TypeScript, sem dado nenhum em runtime) — ex.:
 * src/content/types.ts, src/content/calculators/types.ts. Só barramos os arquivos que
 * carregam dado de verdade: os .json dentro de content/, e index.ts (que os importa).
 *
 * Roda em `npm run validate` (build/pretest). Sai com código 1 se encontrar alguma
 * importação proibida.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

// Pastas do cliente — tudo que vira bundle do navegador. `src/content` fica de fora
// propositalmente (é onde estão os arquivos que este script proíbe de importar) e
// `src` sozinho não entra na lista para não escanear a própria pasta content.
const PASTAS_CLIENTE = ['app', 'ui', 'auth', 'queries', 'storage', 'engine', 'modules', 'admin']

// Captura qualquer import cujo caminho passe por "/content/"; a exceção (arquivo
// "types", em qualquer nível dentro de content/) é decidida em código logo abaixo,
// não neste regex — mais fácil de auditar do que uma negative lookahead aninhada.
const IMPORT_CONTENT = /from\s+['"]([^'"]*\/content\/[^'"]*)['"]/
const EH_MODULO_DE_TIPOS = /\/types$/

function* arquivosTs(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    const info = statSync(caminho)
    if (info.isDirectory()) {
      yield* arquivosTs(caminho)
    } else if (/\.(ts|tsx)$/.test(nome)) {
      yield caminho
    }
  }
}

const violacoes = []

for (const pasta of PASTAS_CLIENTE) {
  const caminhoPasta = join(SRC, pasta)
  try {
    statSync(caminhoPasta)
  } catch {
    continue // pasta ainda não existe nesta fase — ok
  }
  for (const arquivo of arquivosTs(caminhoPasta)) {
    const conteudo = readFileSync(arquivo, 'utf8')
    for (const linha of conteudo.split('\n')) {
      const m = linha.match(IMPORT_CONTENT)
      if (m && !EH_MODULO_DE_TIPOS.test(m[1])) {
        violacoes.push(`${relative(ROOT, arquivo)}: importa "${m[1]}" — conteúdo clínico não pode ir para o bundle do cliente`)
      }
    }
  }
}

if (violacoes.length) {
  console.error('✗ Importação proibida de conteúdo clínico no código do cliente:\n')
  for (const v of violacoes) console.error(`  ${v}`)
  console.error('\nUse src/queries/ (fetch autenticado a /api/content/*) em vez de importar o JSON direto.')
  process.exit(1)
}

console.log('✓ nenhuma importação de conteúdo clínico encontrada no código do cliente')
