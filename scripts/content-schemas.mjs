// Schemas zod do content pack TPOCUS — espelha src/content/types.ts.
//
// Por que duplicado em vez de derivado de types.ts: types.ts é TypeScript puro
// (interfaces, sem presença em runtime); scripts/validate-schema.mjs roda com
// `node` puro, sem passo de build, então o validador de runtime precisa existir
// como JS executável direto. Os dois são checados contra o mesmo JSON real em
// todo `npm run validate` — se um dia divergirem, a checagem de tipo (tsc) ou
// esta validação de forma (zod) acusa o descompasso.
//
// CONVENÇÃO CENTRAL (igual types.ts): null = "o ebook não diz"; [] = "não há itens".
import { z } from 'zod'

const categoria = z.enum(['cardiaca', 'pulmonar', 'vascular', 'abdominal'])
const modo = z.enum(['B', 'M', 'Doppler'])
const transdutor = z.enum(['setorial', 'linear', 'convexo'])

// FonteExterna é recursiva (referenciaComplementar aninha um FonteExterna sem `campos`)
const fonteExternaBase = {
  referencia: z.string(),
  url: z.string().optional(),
  doi: z.string().optional(),
  acesso: z.string().optional(),
  tipo: z.literal('autor').optional(),
  nota: z.string().optional(),
  citacoesOriginais: z.array(z.string()).optional(),
}
const fonteExternaSemCampos = z.object(fonteExternaBase).strict()
export const fonteExterna = z
  .object({
    ...fonteExternaBase,
    campos: z.array(z.string()).min(1),
    referenciaComplementar: fonteExternaSemCampos.optional(),
    referenciasComplementares: z.array(fonteExternaSemCampos).optional(),
  })
  .strict()

const rastreavel = {
  paginaEbook: z.number().int().min(1).max(96),
  paginasEbook: z.array(z.number().int().min(1).max(96)).optional(),
}

export const windowSchema = z
  .object({
    ...rastreavel,
    id: z.string().min(1),
    nome: z.string().min(1),
    categoria,
    transdutor,
    transdutorAlternativo: z.string().optional(),
    posicaoPaciente: z.string(),
    posicaoTransdutor: z.string().nullable(),
    posicaoTransdutorDetalhada: z.string().optional(),
    marcador: z.string(),
    profundidade: z.string().optional(),
    estruturasVisualizadas: z.array(z.string()),
    comoOtimizar: z.array(z.string()),
    errosComuns: z.array(z.string()),
    oQueAvaliar: z.array(z.string()),
    verTambem: z.array(z.string()).optional(),
    usoNoEfast: z.string().optional(),
    fonteExterna: fonteExterna.optional(),
  })
  .passthrough() // campos extras aditivos são permitidos, ver docs/content-pack-README.md

export const findingSchema = z
  .object({
    ...rastreavel,
    id: z.string().min(1),
    nome: z.string().min(1),
    modo,
    descricao: z.string(),
    significadoClinico: z.string(),
    diagnosticosAssociados: z.array(z.string()),
    armadilhas: z.array(z.string()),
    observacao: z.string().optional(),
    fonteExterna: fonteExterna.optional(),
  })
  .passthrough()

export const pathologySchema = z
  .object({
    ...rastreavel,
    id: z.string().min(1),
    nome: z.string().min(1),
    achados: z.array(z.string()),
    findingsRelacionados: z.array(z.string()),
  })
  .passthrough()

const faixaReferencia = z
  .object({
    faixa: z.string(),
    interpretacao: z.string(),
    faixaOriginalEbook: z.string().optional(),
    interpretacaoOriginalEbook: z.string().optional(),
  })
  .strict()

export const measurementSchema = z
  .object({
    ...rastreavel,
    id: z.string().min(1),
    nome: z.string().min(1),
    janela: z.string().nullable(),
    modo,
    passosAquisicao: z.array(z.string()),
    formula: z.string().nullable(),
    unidades: z.string(),
    referencias: z.array(faixaReferencia),
    armadilhas: z.array(z.string()),
    prerequisitos: z.array(z.string()),
    notaFidelidade: z.string().optional(),
    exemploEbook: z.string().optional(),
    dicas: z.array(z.string()).optional(),
  })
  .passthrough()

export const glossaryEntrySchema = z
  .object({
    ...rastreavel,
    id: z.string().min(1),
    sigla: z.string(),
    termo: z.string(),
    definicao: z.string(),
    categoria: z.enum(['geral', 'cardiaca', 'pulmonar', 'vascular', 'medida', 'protocolo']),
    fonteExterna: fonteExterna.optional(),
  })
  .passthrough()

const referencia = z
  .object({
    ordem: z.number().int().nullable(),
    citacao: z.string(),
    doi: z.string().optional(),
    url: z.string().optional(),
  })
  .strict()

export const referenceChapterSchema = z
  .object({
    capitulo: z.string(),
    capituloId: z.string(),
    paginaEbook: z.number().int().min(1).max(96).nullable(),
    paginasEbook: z.array(z.number().int().min(1).max(96)).optional(),
    referencias: z.array(referencia),
    observacao: z.string().optional(),
  })
  .passthrough()

// ------------------------------------------------------------- protocols

const perfilBlue = z
  .object({
    id: z.string(),
    nome: z.string(),
    definicao: z.string(),
    citacaoOriginal: z.string(),
    significado: z.string(),
  })
  .strict()

const pontoBlue = z
  .object({
    id: z.string(),
    nome: z.string(),
    localizacao: z.string(),
    detalheComplementar: z.string().optional(),
  })
  .strict()

const regraDecisaoBlue = z
  .object({
    perfil: z.string(),
    diagnostico: z.string(),
    citacaoOriginal: z.string(),
  })
  .strict()

// RamoFluxograma é recursivo — precisa de z.lazy()
const ramoFluxograma = z.lazy(() =>
  z
    .object({
      condicao: z.string().optional(),
      perfil: z.string().optional(),
      desfecho: z.string().optional(),
      subRamos: z.array(ramoFluxograma).optional(),
      proximosPassos: z.array(ramoFluxograma).optional(),
    })
    .strict(),
)

const etapaCasa = z
  .object({
    numero: z.number().int(),
    nome: z.string(),
    duracaoMaxSegundos: z.number().int().positive(),
    pergunta: z.string(),
    comoFazer: z.string(),
    prevalencia: z.string().optional(),
    significado: z.string().optional(),
    prognostico: z.string().optional(),
    conduta: z.string(),
  })
  .strict()

const etapaAncilarCasa = z
  .object({
    nome: z.string(),
    momento: z.string(),
    comoFazer: z.string(),
    prevalencia: z.string().optional(),
    conduta: z.string().optional(),
    observacao: z.string().optional(),
  })
  .strict()

export const protocolSchema = z
  .object({
    id: z.string().min(1),
    nome: z.string().min(1),
    autoria: z.string().nullable(),
    objetivo: z.string(),
    paginaEbook: z.number().int().min(1).max(96).nullable().optional(),
    paginasEbook: z.array(z.number().int().min(1).max(96)).optional(),
    descricaoTextual: z.array(z.string()).optional(),
    limitacoes: z.array(z.string()).optional(),

    status: z.literal('pendente_validacao').optional(),
    fonteExterna: fonteExterna.optional(),

    // BLUE
    fluxograma: z
      .object({
        origemDados: z.string(),
        figura: z.string(),
        raiz: z.string(),
        ramos: z.array(ramoFluxograma),
      })
      .strict()
      .optional(),
    lacunas: z.array(z.string()).optional(),
    perfis: z.array(perfilBlue).optional(),
    perfisFonteExterna: fonteExterna.optional(),
    pontosBlue: z
      .object({ tecnica: z.string(), citacaoOriginal: z.string(), pontos: z.array(pontoBlue) })
      .strict()
      .optional(),
    pontosBlueFonteExterna: fonteExterna.optional(),
    regrasDecisao: z.array(regraDecisaoBlue).optional(),
    regrasDecisaoFonteExterna: fonteExterna.optional(),

    // E-FAST
    contexto: z.array(z.string()).optional(),
    janelas: z.array(z.string()).optional(),
    vantagens: z.array(z.string()).optional(),
    interpretacao: z.array(z.string()).optional(),
    sinaisPulmonares: z.array(z.string()).optional(),

    // RUSH
    conceitoCentral: z.string().optional(),
    elementos: z
      .array(
        z
          .object({
            elemento: z.string(),
            analogia: z.string(),
            objetivo: z.string(),
            exemplosAchados: z.string(),
            janelas: z.array(z.string()),
            oQueObservar: z.array(z.string()),
          })
          .strict(),
      )
      .optional(),
    tiposDeChoque: z
      .array(
        z
          .object({ tipo: z.string(), achadosRush: z.string(), condutaInicial: z.string() })
          .strict(),
      )
      .optional(),
    beneficios: z.array(z.string()).optional(),

    // CASA
    contextoClinico: z.array(z.string()).optional(),
    estrutura: z.array(z.string()).optional(),
    timerSegundos: z.number().int().positive().optional(),
    alertaRetomarCompressoes: z.boolean().optional(),
    recomendacaoTimer: z.string().optional(),
    etapas: z.array(etapaCasa).optional(),
    etapasAncilares: z.array(etapaAncilarCasa).optional(),
    exclusoesExplicitas: z.array(z.string()).optional(),
    resultadosImplementacao: z.array(z.string()).optional(),
    avisoClinico: z.string().optional(),
  })
  .passthrough()

export const imagemEbookSchema = z
  .object({
    ...rastreavel,
    id: z.string().min(1),
    arquivo: z.string().min(1),
    formato: z.literal('webp'),
    figuraNumero: z.number().int().nullable(),
    legendaEbook: z.string().nullable(),
    secaoEbook: z.string(),
    categoria: z.union([categoria, z.literal('medida'), z.literal('protocolo')]),
    largura: z.number().int().positive(),
    altura: z.number().int().positive(),
    bytes: z.number().int().positive(),
    windowIds: z.array(z.string()),
    findingIds: z.array(z.string()),
    measurementIds: z.array(z.string()),
    pathologyIds: z.array(z.string()),
    protocolIds: z.array(z.string()),
  })
  .passthrough()

export const correcaoSchema = z
  .object({
    arquivo: z.string(),
    itemId: z.string(),
    campo: z.string(),
    original: z.string(),
    corrigido: z.string(),
    paginaEbook: z.number().int().min(1).max(96),
    tipo: z.string(),
  })
  .strict()

// arquivo -> schema do item (cada JSON é um array desses itens)
export const schemasPorArquivo = {
  'windows.json': windowSchema,
  'findings.json': findingSchema,
  'pathologies.json': pathologySchema,
  'measurements.json': measurementSchema,
  'glossary.json': glossaryEntrySchema,
  'references.json': referenceChapterSchema,
  'protocols.json': protocolSchema,
  'images.json': imagemEbookSchema,
  'corrections.json': correcaoSchema,
}
