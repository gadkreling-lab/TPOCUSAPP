// Schema zod do grafo de execução dos protocolos — espelha
// src/content/protocol-flows/types.ts. Mesma razão de duplicação que
// scripts/content-schemas.mjs: validate-schema.mjs roda com `node` puro.
import { z } from 'zod'

const confianca = z.enum(['alta', 'media', 'baixa', 'indeterminado'])

const opcaoPergunta = z
  .object({
    label: z.string().min(1),
    proximo: z.string().min(1),
  })
  .strict()

const noPergunta = z
  .object({
    tipo: z.literal('pergunta'),
    janela: z.string().min(1).nullable(),
    comoFazer: z.string().optional(),
    pergunta: z.string().min(1),
    opcoes: z.array(opcaoPergunta).min(1),
    // Obrigatório — "não consegui avaliar" precisa de destino em TODO nó de pergunta.
    indeterminadoProximo: z.string().min(1),
    achadosDeApoio: z.array(z.string()).optional(),
    imagemId: z.string().optional(),
  })
  .strict()

const noConclusao = z
  .object({
    tipo: z.literal('conclusao'),
    diagnostico: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    confianca,
    justificativa: z.string().min(1),
    proximosPassos: z.array(z.string()),
    cuidado: z.string().min(1),
  })
  .strict()

const noProtocolo = z.discriminatedUnion('tipo', [noPergunta, noConclusao])

export const protocolFlowSchema = z
  .object({
    id: z.string().min(1),
    noInicial: z.string().min(1),
    nos: z.record(z.string(), noProtocolo),
  })
  .strict()
  .superRefine((flow, ctx) => {
    const idsExistentes = new Set(Object.keys(flow.nos))
    if (!idsExistentes.has(flow.noInicial)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['noInicial'],
        message: `noInicial "${flow.noInicial}" não existe em "nos"`,
      })
    }
    for (const [noId, no] of Object.entries(flow.nos)) {
      if (no.tipo !== 'pergunta') continue
      const destinos = [...no.opcoes.map((o) => o.proximo), no.indeterminadoProximo]
      for (const destino of destinos) {
        if (!idsExistentes.has(destino)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['nos', noId],
            message: `nó "${noId}" aponta para "${destino}", que não existe em "nos"`,
          })
        }
      }
    }
  })
