// As 6 calculadoras do Módulo 2 — ver ARQUITETURA.md §2.1 e src/content/calculators/.
// Import estático explícito (em vez de listar o diretório em runtime): mais simples
// de auditar, e o build falha na hora se um arquivo for renomeado/removido.
import debitoCardiaco from '../../src/content/calculators/debito-cardiaco.json'
import epss from '../../src/content/calculators/epss.json'
import mapse from '../../src/content/calculators/mapse.json'
import tapse from '../../src/content/calculators/tapse.json'
import vciResponsividade from '../../src/content/calculators/vci-responsividade.json'
import derramePleural from '../../src/content/calculators/derrame-pleural.json'
import { criarHandlerConteudo } from '../_lib/conteudo'

const calculadoras = [debitoCardiaco, epss, mapse, tapse, vciResponsividade, derramePleural]

export default criarHandlerConteudo(calculadoras)
