#!/usr/bin/env node
/**
 * Validação de FORMA do content pack TPOCUS via zod — espelha src/content/types.ts.
 *   node scripts/validate-schema.mjs
 *
 * Diferente de scripts/validate-content.mjs (que valida domínio: ids únicos, enums,
 * chaves estrangeiras, imagens em disco — conhecimento específico deste content pack),
 * este script valida só a FORMA: cada item de cada arquivo bate com o schema esperado,
 * com o path exato do campo que falhou. Os dois convivem — ver ARQUITETURA.md §5.
 *
 * Falha o build (exit 1) se qualquer item não bater com o schema — inclui campo
 * obrigatório faltando, tipo errado, enum fora do domínio.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { schemasPorArquivo } from './content-schemas.mjs'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')

let totalItens = 0
let totalErros = 0

for (const [arquivo, schema] of Object.entries(schemasPorArquivo)) {
  const caminho = join(DIR, arquivo)
  let dados
  try {
    dados = JSON.parse(readFileSync(caminho, 'utf8'))
  } catch (e) {
    console.error(`✗ ${arquivo} não parseia: ${e.message}`)
    totalErros++
    continue
  }
  if (!Array.isArray(dados)) {
    console.error(`✗ ${arquivo}: esperado um array no nível raiz`)
    totalErros++
    continue
  }
  dados.forEach((item, i) => {
    totalItens++
    const resultado = schema.safeParse(item)
    if (!resultado.success) {
      const rotulo = item?.id ?? item?.capituloId ?? `índice ${i}`
      for (const issue of resultado.error.issues) {
        const path = issue.path.length ? issue.path.join('.') : '(raiz)'
        console.error(`✗ ${arquivo} [${rotulo}] campo "${path}": ${issue.message}`)
        totalErros++
      }
    }
  })
}

console.log(`\nValidação de schema (zod): ${totalItens} itens verificados em ${Object.keys(schemasPorArquivo).length} arquivos.`)
if (totalErros) {
  console.error(`\n✗ ${totalErros} erro(s) de schema.`)
  process.exit(1)
}
console.log('✓ todos os itens batem com o schema esperado')
