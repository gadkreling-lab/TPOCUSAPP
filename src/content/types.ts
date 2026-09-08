/**
 * Tipos do content pack TPOCUS.
 * Gerados a partir do schema real dos JSON — ver docs/content-pack-README.md.
 *
 * CONVENÇÃO CENTRAL:
 *   null  = o ebook NÃO informa esse dado (não renderizar; nunca preencher)
 *   []    = não há itens dessa categoria
 */

export type Categoria = 'cardiaca' | 'pulmonar' | 'vascular' | 'abdominal'
export type Modo = 'B' | 'M' | 'Doppler'
export type Transdutor = 'setorial' | 'linear' | 'convexo'

/**
 * Marca conteúdo que NÃO vem do ebook.
 * Presente só nos itens preenchidos a partir da literatura (ou do autor do curso).
 * `campos` lista exatamente quais campos daquele item têm origem externa.
 * A UI deve sinalizar esses campos ao usuário — ver CLAUDE.md, Regra 2.
 */
export interface FonteExterna {
  referencia: string
  url?: string
  doi?: string
  acesso?: string
  /** "autor" quando a definição foi fornecida pelo autor do curso, não pela literatura */
  tipo?: 'autor'
  campos: string[]
  nota?: string
  referenciaComplementar?: Omit<FonteExterna, 'campos'>
  referenciasComplementares?: Omit<FonteExterna, 'campos'>[]
  /** frase literal, em inglês, como publicada na fonte */
  citacoesOriginais?: string[]
}

interface Rastreavel {
  /** página onde o conteúdo é definido — âncora de rastreabilidade */
  paginaEbook: number
  /** todas as páginas relevantes, quando o assunto se espalha */
  paginasEbook?: number[]
}

// ---------------------------------------------------------------- windows

export interface Window extends Rastreavel {
  id: string
  nome: string
  categoria: Categoria
  transdutor: Transdutor
  transdutorAlternativo?: string
  posicaoPaciente: string
  /** redação do ebook; null quando o ebook não descreve a janela */
  posicaoTransdutor: string | null
  /** técnica vinda de fonte externa — usar como fallback de posicaoTransdutor */
  posicaoTransdutorDetalhada?: string
  marcador: string
  profundidade?: string
  estruturasVisualizadas: string[]
  comoOtimizar: string[]
  errosComuns: string[]
  oQueAvaliar: string[]
  verTambem?: string[]
  fonteExterna?: FonteExterna
}

// --------------------------------------------------------------- findings

export interface Finding extends Rastreavel {
  id: string
  nome: string
  modo: Modo
  descricao: string
  significadoClinico: string
  diagnosticosAssociados: string[]
  armadilhas: string[]
  observacao?: string
  fonteExterna?: FonteExterna
}

// ------------------------------------------------------------ pathologies

export interface Pathology extends Rastreavel {
  id: string
  nome: string
  /** conteúdo verbatim da tabela das págs. 58-59, linha por linha, na ordem impressa */
  achados: string[]
  /** cruzamento nosso com findings.id — não é conteúdo do ebook */
  findingsRelacionados: string[]
}

// ----------------------------------------------------------- measurements

export interface FaixaReferencia {
  faixa: string
  interpretacao: string
  /** texto impresso no ebook, antes da correção ortográfica */
  faixaOriginalEbook?: string
  interpretacaoOriginalEbook?: string
}

export interface Measurement extends Rastreavel {
  id: string
  nome: string
  /** windows.id; pode ser composto ("id-a + id-b"); null quando não especificado */
  janela: string | null
  modo: Modo
  passosAquisicao: string[]
  /** null nas medidas diretas (EPSS, MAPSE, TAPSE, diâmetros) */
  formula: string | null
  unidades: string
  referencias: FaixaReferencia[]
  armadilhas: string[]
  /** condições de validade da medida — não são sugestões */
  prerequisitos: string[]
  notaFidelidade?: string
  exemploEbook?: string
  dicas?: string[]
}

// -------------------------------------------------------------- glossary

export interface GlossaryEntry extends Rastreavel {
  id: string
  /** "—" quando o termo não tem sigla */
  sigla: string
  termo: string
  definicao: string
  categoria: 'geral' | 'cardiaca' | 'pulmonar' | 'vascular' | 'medida' | 'protocolo'
  fonteExterna?: FonteExterna
}

// ------------------------------------------------------------ references

export interface Referencia {
  /** número impresso, ou null se a lista não é numerada */
  ordem: number | null
  citacao: string
  doi?: string
  url?: string
}

export interface ReferenceChapter {
  capitulo: string
  capituloId: string
  paginaEbook: number | null
  paginasEbook?: number[]
  referencias: Referencia[]
  observacao?: string
}

// ------------------------------------------------------------- protocols

export interface PerfilBlue {
  id: string
  nome: string
  definicao: string
  /** frase literal em inglês, como publicada por Lichtenstein */
  citacaoOriginal: string
  significado: string
}

export interface PontoBlue {
  id: string
  nome: string
  localizacao: string
  detalheComplementar?: string
}

export interface RegraDecisaoBlue {
  perfil: string
  diagnostico: string
  citacaoOriginal: string
}

/** Nó do fluxograma — transcrição literal da Figura 16 do ebook */
export interface RamoFluxograma {
  condicao?: string
  perfil?: string
  desfecho?: string
  subRamos?: RamoFluxograma[]
  proximosPassos?: RamoFluxograma[]
}

export interface Protocol extends Rastreavel {
  id: string
  nome: string
  autoria: string | null
  objetivo: string
  descricaoTextual?: string[]
  limitacoes?: string[]

  /** BLUE — transcrição literal da Figura 16 do ebook. NÃO fundir com regrasDecisao. */
  fluxograma?: {
    origemDados: string
    figura: string
    raiz: string
    ramos: RamoFluxograma[]
  }
  lacunas?: string[]
  perfis?: PerfilBlue[]
  perfisFonteExterna?: FonteExterna
  pontosBlue?: {
    tecnica: string
    citacaoOriginal: string
    pontos: PontoBlue[]
  }
  pontosBlueFonteExterna?: FonteExterna
  /** algoritmo do artigo original — diverge do fluxograma do ebook, e é assim mesmo */
  regrasDecisao?: RegraDecisaoBlue[]
  regrasDecisaoFonteExterna?: FonteExterna

  /** E-FAST */
  contexto?: string[]
  janelas?: string[]
  vantagens?: string[]
  interpretacao?: string[]
  sinaisPulmonares?: string[]

  /** RUSH */
  conceitoCentral?: string
  elementos?: {
    elemento: string
    analogia: string
    objetivo: string
    exemplosAchados: string
    janelas: string[]
    oQueObservar: string[]
  }[]
  tiposDeChoque?: {
    tipo: string
    achadosRush: string
    condutaInicial: string
  }[]
  beneficios?: string[]
}

// ---------------------------------------------------------------- images

export interface ImagemEbook extends Rastreavel {
  id: string
  /** nome do arquivo dentro de src/content/images/ */
  arquivo: string
  formato: 'webp'
  /** número impresso no ebook, ou null quando a figura não é numerada */
  figuraNumero: number | null
  /** legenda literal do ebook; null nas 16 figuras publicadas sem legenda */
  legendaEbook: string | null
  /** título da seção onde a figura aparece — usar quando legendaEbook é null */
  secaoEbook: string
  categoria: Categoria | 'medida' | 'protocolo'
  largura: number
  altura: number
  bytes: number
  windowIds: string[]
  findingIds: string[]
  measurementIds: string[]
  pathologyIds: string[]
  protocolIds: string[]
}

// ----------------------------------------------------------- corrections

export interface Correcao {
  arquivo: string
  itemId: string
  campo: string
  original: string
  corrigido: string
  paginaEbook: number
  tipo: string
}
