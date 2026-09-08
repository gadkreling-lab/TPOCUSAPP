/**
 * Tipos do grafo de execução dos protocolos (Módulo 3) — content é dado, motor é código.
 * Ver ARQUITETURA.md §2.2 e §3.1.
 *
 * Este schema é DIFERENTE do `Protocol` de src/content/types.ts: `Protocol` é o
 * material descritivo (o "manual" — objetivo, vantagens, tabela de perfis, o
 * `fluxograma` que é transcrição literal da Figura 16 do BLUE). `ProtocolFlow` é o
 * "roteiro" que a máquina de estados do motor percorre — pergunta, opções, próximo nó.
 * Não fundir os dois arquivos: CLAUDE.md Regra 4 (transcrição vs. correção) e a nota do
 * BLUE em ARQUITETURA.md §2.2 pedem essa separação — `fluxograma` (fonte: figura do
 * ebook) e `regrasDecisao` (fonte: artigo) precisam conviver sem um substituir o outro,
 * e um `ProtocolFlow` de execução é uma terceira coisa: nem um nem outro, um roteiro
 * derivado para a UI guiada.
 */

export type ConfiancaConclusao = 'alta' | 'media' | 'baixa' | 'indeterminado'

export interface OpcaoPergunta {
  label: string
  /** id de outro nó em `ProtocolFlow.nos` (pergunta ou conclusão). */
  proximo: string
}

export interface NoPergunta {
  tipo: 'pergunta'
  /** id de uma janela em windows.json — a UI pode buscar/exibir o conteúdo da janela junto da pergunta. */
  janela: string | null
  comoFazer?: string
  pergunta: string
  opcoes: OpcaoPergunta[]
  /**
   * Obrigatório em todo nó de pergunta — "não consegui avaliar esta janela" precisa
   * sempre ter um próximo passo definido, nunca deixar o aluno num beco sem saída do
   * grafo. O zod (protocol-flow-schemas.mjs) falha o build se faltar.
   */
  indeterminadoProximo: string
  achadosDeApoio?: string[]
  imagemId?: string
}

export interface NoConclusao {
  tipo: 'conclusao'
  /** string[] quando mais de um perfil é compatível com os achados (ex.: RUSH em choque misto). */
  diagnostico: string | string[]
  confianca: ConfiancaConclusao
  justificativa: string
  proximosPassos: string[]
  cuidado: string
}

export type NoProtocolo = NoPergunta | NoConclusao

export interface ProtocolFlow {
  /** mesmo id do Protocol correspondente em protocols.json. */
  id: string
  noInicial: string
  nos: Record<string, NoProtocolo>
}
