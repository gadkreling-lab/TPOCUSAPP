// Hooks tipados por recurso — a forma normal de um módulo pedir conteúdo.
// Cada um só amarra useConteudo a um recurso e a um tipo de src/content/types.ts
// (tipos são seguros de importar no cliente; os JSONs em si não são, ver
// scripts/check-client-content-imports.mjs).
import type {
  Correcao,
  Finding,
  GlossaryEntry,
  ImagemEbook,
  Pathology,
  Protocol,
  ReferenceChapter,
  Window,
  Measurement,
} from '../content/types'
import type { CalculatorDef } from '../content/calculators/types'
import type { ProtocolFlow } from '../content/protocol-flows/types'
import { useEffect, useState } from 'react'
import { useSessao } from '../auth/SessionProvider'
import { ErroConteudo } from './client'
import { useConteudo, type EstadoConteudo } from './useConteudo'

export const useWindows = (): EstadoConteudo<Window[]> => useConteudo<Window[]>('windows')
export const useCalculators = (): EstadoConteudo<CalculatorDef[]> => useConteudo<CalculatorDef[]>('calculators')
export const useFindings = (): EstadoConteudo<Finding[]> => useConteudo<Finding[]>('findings')
export const usePathologies = (): EstadoConteudo<Pathology[]> => useConteudo<Pathology[]>('pathologies')
export const useMeasurements = (): EstadoConteudo<Measurement[]> => useConteudo<Measurement[]>('measurements')
export const useGlossary = (): EstadoConteudo<GlossaryEntry[]> => useConteudo<GlossaryEntry[]>('glossary')
export const useReferences = (): EstadoConteudo<ReferenceChapter[]> => useConteudo<ReferenceChapter[]>('references')
export const useProtocols = (): EstadoConteudo<Protocol[]> => useConteudo<Protocol[]>('protocols')
export const useProtocolFlows = (): EstadoConteudo<ProtocolFlow[]> => useConteudo<ProtocolFlow[]>('protocol-flows')
export const useImagesCatalog = (): EstadoConteudo<ImagemEbook[]> => useConteudo<ImagemEbook[]>('images')

/**
 * Busca a imagem autenticada e devolve um object URL pronto para `<img src>`.
 * Uma tag <img> comum não manda cabeçalho Authorization — por isso o binário é
 * buscado via fetch (com Bearer) e convertido em blob URL local, não um caminho
 * estático direto para api/imagem.
 */
export function useImagemUrl(arquivo: string | null): EstadoConteudo<string> {
  const { obterTokenAcesso } = useSessao()
  const [estado, setEstado] = useState<EstadoConteudo<string>>({ status: 'carregando' })

  useEffect(() => {
    if (!arquivo) return
    let cancelado = false
    let urlCriada: string | null = null
    setEstado({ status: 'carregando' })

    ;(async () => {
      const token = await obterTokenAcesso()
      if (!token) throw new ErroConteudo('nao_autenticado', 'Sessão expirada.')
      const resp = await fetch(`/api/imagem?arquivo=${encodeURIComponent(arquivo)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!resp.ok) throw new ErroConteudo(`http_${resp.status}`, 'Não foi possível carregar a imagem.')
      const blob = await resp.blob()
      urlCriada = URL.createObjectURL(blob)
      if (!cancelado) setEstado({ status: 'pronto', dados: urlCriada })
    })().catch((e: unknown) => {
      if (cancelado) return
      const erro = e instanceof ErroConteudo ? e : new ErroConteudo('erro_desconhecido', 'Erro ao carregar imagem.')
      setEstado({ status: 'erro', erro })
    })

    return () => {
      cancelado = true
      if (urlCriada) URL.revokeObjectURL(urlCriada)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivo])

  return estado
}

// Não exportamos Correcao por hook próprio (só usado em telas de auditoria/Sobre,
// se vierem a existir) — deixado importável via useConteudo<Correcao[]>('corrections')
// diretamente onde for preciso.
export type { Correcao }
