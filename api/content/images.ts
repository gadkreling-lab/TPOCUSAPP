// Catálogo das imagens (metadados — legenda, vínculos, dimensões). O binário de cada
// figura é servido à parte por api/content/images/[arquivo].ts.
import dados from '../../src/content/images.json'
import { criarHandlerConteudo } from '../_lib/conteudo'

export default criarHandlerConteudo(dados)
