// Grafo de execução dos protocolos (Módulo 3) — ver ARQUITETURA.md §2.2 e
// src/content/protocol-flows/. Import estático explícito, mesmo raciocínio de
// api/content/calculators.ts: mais simples de auditar, falha o build se um arquivo
// for renomeado/removido em vez de silenciosamente sumir em runtime.
import blue from '../../src/content/protocol-flows/blue.json'
import efast from '../../src/content/protocol-flows/efast.json'
import rush from '../../src/content/protocol-flows/rush.json'
import casa from '../../src/content/protocol-flows/casa.json'
import { criarHandlerConteudo } from '../_lib/conteudo'

const protocolFlows = [blue, efast, rush, casa]

export default criarHandlerConteudo(protocolFlows)
