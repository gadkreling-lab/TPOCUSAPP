import { useEffect, useState } from 'react'
import { useSessao } from '../auth/SessionProvider'
import { buscarConteudo, ErroConteudo } from './client'

export type EstadoConteudo<T> =
  | { status: 'carregando' }
  | { status: 'erro'; erro: ErroConteudo }
  | { status: 'pronto'; dados: T }

/**
 * Hook genérico de busca de conteúdo — GET /api/content/<recurso>, autenticado,
 * cacheado em memória pela sessão. Os hooks tipados em src/queries/hooks.ts são a
 * forma normal de uso nos módulos; este fica exposto para casos que precisem de um
 * recurso ainda sem hook dedicado.
 */
export function useConteudo<T>(recurso: string): EstadoConteudo<T> {
  const { obterTokenAcesso } = useSessao()
  const [estado, setEstado] = useState<EstadoConteudo<T>>({ status: 'carregando' })

  useEffect(() => {
    let cancelado = false
    setEstado({ status: 'carregando' })
    buscarConteudo<T>(recurso, obterTokenAcesso)
      .then((dados) => {
        if (!cancelado) setEstado({ status: 'pronto', dados })
      })
      .catch((e: unknown) => {
        if (cancelado) return
        const erro = e instanceof ErroConteudo ? e : new ErroConteudo('erro_desconhecido', 'Erro inesperado ao carregar conteúdo.')
        setEstado({ status: 'erro', erro })
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurso])

  return estado
}
