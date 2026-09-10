/**
 * GET /api/content/:recurso — sirva um dos 10 recursos de conteúdo "array de dados
 * inteiro" numa função só, em vez de um arquivo por recurso. Ver
 * api/_lib/conteudo.ts (criarHandlerConteudoDinamico) pra explicação do porquê: limite
 * de 12 Serverless Functions do plano Hobby da Vercel, não decisão de arquitetura.
 *
 * O binário de cada imagem continua em api/content/images/[arquivo].ts (rota mais
 * profunda, resposta binária — não cabe nesse padrão de "devolve o JSON inteiro").
 *
 * Imports estáticos explícitos (mesmo raciocínio dos arquivos que este substitui):
 * mais simples de auditar, e o build falha na hora se um arquivo for renomeado ou
 * removido, em vez de sumir silenciosamente em runtime.
 */
import windows from '../../src/content/windows.json'
import findings from '../../src/content/findings.json'
import pathologies from '../../src/content/pathologies.json'
import measurements from '../../src/content/measurements.json'
import glossary from '../../src/content/glossary.json'
import references from '../../src/content/references.json'
import protocols from '../../src/content/protocols.json'
import images from '../../src/content/images.json'
import debitoCardiaco from '../../src/content/calculators/debito-cardiaco.json'
import epss from '../../src/content/calculators/epss.json'
import mapse from '../../src/content/calculators/mapse.json'
import tapse from '../../src/content/calculators/tapse.json'
import vciResponsividade from '../../src/content/calculators/vci-responsividade.json'
import derramePleural from '../../src/content/calculators/derrame-pleural.json'
import blue from '../../src/content/protocol-flows/blue.json'
import efast from '../../src/content/protocol-flows/efast.json'
import rush from '../../src/content/protocol-flows/rush.json'
import casa from '../../src/content/protocol-flows/casa.json'
import { criarHandlerConteudoDinamico } from '../_lib/conteudo.js'

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
