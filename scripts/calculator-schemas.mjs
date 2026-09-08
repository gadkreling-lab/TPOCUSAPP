// Schema zod das calculadoras — espelha src/content/calculators/types.ts.
// Mesma razão de duplicação que scripts/content-schemas.mjs: validate-schema.mjs roda
// com `node` puro, sem passo de build.
import { z } from 'zod'

const severidade = z.enum(['normal', 'limitrofe', 'alterado'])
const tipoCampo = z.enum(['numero', 'booleano', 'selecao'])
const operador = z.enum(['<', '<=', '>', '>=', 'entreExclusive', 'entreInclusive', 'igual'])

const opcaoSelecao = z.object({ valor: z.string(), label: z.string() }).strict()

const fieldDef = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    tipo: tipoCampo,
    unidade: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    opcional: z.boolean().optional(),
    opcoes: z.array(opcaoSelecao).optional(),
    padrao: z.union([z.string(), z.boolean()]).optional(),
    ajudaRapidaImpacto: z.boolean().optional(),
    grupo: z.string().optional(),
    somenteSeCampo: z.object({ id: z.string(), valor: z.string() }).strict().optional(),
    dicaFaixa: z.string().optional(),
  })
  .strict()

const condicao = z
  .object({
    variavel: z.string().min(1),
    operador,
    valor: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict()

const faixaInterpretacao = z
  .object({
    condicoes: z.array(condicao).min(1),
    texto: z.string().min(1),
    severidade,
    origem: z.enum(['ebook', 'complementar']),
  })
  .strict()

const avisoCondicional = z
  .object({
    campos: z.array(z.string()).min(1),
    modo: z.enum(['qualquerVerdadeiro', 'algumFalso']),
    mensagem: z.string().min(1),
  })
  .strict()

const resultDef = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    unidade: z.string(),
    formula: z.string().min(1),
    faixaReferencia: z.object({ min: z.number(), max: z.number() }).strict().optional(),
    faixas: z.array(faixaInterpretacao),
    textoNaoClassificado: z.string().min(1),
    origem: z.enum(['ebook', 'complementar']),
    paginaEbook: z.number().int().min(1).max(96).optional(),
    avisosCondicionais: z.array(avisoCondicional).optional(),
    somenteSeCamposPreenchidos: z.array(z.string()).optional(),
    somenteSeCampo: z.object({ id: z.string(), valor: z.string() }).strict().optional(),
  })
  .strict()

export const calculatorDefSchema = z
  .object({
    id: z.string().min(1),
    nome: z.string().min(1),
    paginaEbook: z.number().int().min(1).max(96).nullable(),
    campos: z.array(fieldDef).min(1),
    resultados: z.array(resultDef).min(1),
    comoMedir: z.array(z.string()),
    armadilhas: z.array(z.string()),
    dicas: z.array(z.string()).optional(),
  })
  .strict()
