/**
 * GET /api/conteudo?recurso=<recurso> — sirva um dos 10 recursos de conteúdo "array de
 * dados inteiro" numa função só. Ver api/_lib/conteudo.ts (criarHandlerConteudoDinamico)
 * pra explicação do porquê disso ser uma função só: limite de 12 Serverless Functions
 * do plano Hobby da Vercel, não decisão de arquitetura.
 *
 * NÃO é uma rota dinâmica com colchete (api/content/[recurso].ts, como era antes) —
 * `recurso` vem de query string numa rota de nome fixo. Ver ARQUITETURA.md, "Quinta
 * correção encontrada durante o deploy": as rotas dinâmicas com colchete de api/ nunca
 * funcionaram de forma confiável neste projeto na Vercel (rewrite do SPA + cache de
 * borda mascarando o problema, em pelo menos duas causas concorrentes que não foram
 * possíveis de isolar com certeza) — toda rota estática (arquivo sem colchete) sempre
 * funcionou sem exceção. Em vez de continuar caçando a causa exata numa plataforma que
 * não dá pra inspecionar localmente, a rota mudou de forma pra evitar a categoria
 * inteira do problema.
 *
 * O binário de cada imagem está em api/imagem.ts (mesmo raciocínio, também não é mais
 * rota dinâmica) — não cabe nesse padrão de "devolve o JSON inteiro".
 *
 * Imports estáticos explícitos (mesmo raciocínio do arquivo que este substitui): mais
 * simples de auditar, e o build falha na hora se um arquivo for renomeado ou removido,
 * em vez de sumir silenciosamente em runtime.
 *
 * `with { type: 'json' }` em cada import: obrigatório em Node.js recente sob ESM
 * nativo (a função roda em Node.js 24.x na Vercel) — sem isso, `TypeError
 * [ERR_IMPORT_ATTRIBUTE_MISSING]` derruba a função inteira no primeiro import, mas só
 * em runtime. O TypeScript (resolveJsonModule) deixa compilar sem essa cláusula, então
 * nunca aparece como erro de build/typecheck — só quebra de verdade na Vercel. Se um
 * import de `.json` novo for adicionado em `api/**`, já nasce com essa cláusula.
 */
import windows from '../src/content/windows.json' with { type: 'json' }
import findings from '../src/content/findings.json' with { type: 'json' }
import pathologies from '../src/content/pathologies.json' with { type: 'json' }
import measurements from '../src/content/measurements.json' with { type: 'json' }
import glossary from '../src/content/glossary.json' with { type: 'json' }
import references from '../src/content/references.json' with { type: 'json' }
import protocols from '../src/content/protocols.json' with { type: 'json' }
import images from '../src/content/images.json' with { type: 'json' }
import debitoCardiaco from '../src/content/calculators/debito-cardiaco.json' with { type: 'json' }
import epss from '../src/content/calculators/epss.json' with { type: 'json' }
import mapse from '../src/content/calculators/mapse.json' with { type: 'json' }
import tapse from '../src/content/calculators/tapse.json' with { type: 'json' }
import vciResponsividade from '../src/content/calculators/vci-responsividade.json' with { type: 'json' }
import derramePleural from '../src/content/calculators/derrame-pleural.json' with { type: 'json' }
import blue from '../src/content/protocol-flows/blue.json' with { type: 'json' }
import efast from '../src/content/protocol-flows/efast.json' with { type: 'json' }
import rush from '../src/content/protocol-flows/rush.json' with { type: 'json' }
import casa from '../src/content/protocol-flows/casa.json' with { type: 'json' }
import { criarHandlerConteudoDinamico } from './_lib/conteudo.js'

const calculadoras = [debitoCardiaco, epss, mapse, tapse, vciResponsividade, derramePleural]
const protocolFlows = [blue, efast, rush, casa]

export default criarHandlerConteudoDinamico({
  windows,
  findings,
  pathologies,
  measurements,
  glossary,
  references,
  protocols,
  images,
  calculators: calculadoras,
  'protocol-flows': protocolFlows,
})
