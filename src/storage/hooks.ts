import { useEffect, useState } from 'react'
import { listarSessoes, obterSessao } from './db'
import type { SessaoExame } from './tipos'

/** Lista de sessões salvas, mais recente primeiro. `null` enquanto carrega. */
export function useSessoes(): { sessoes: SessaoExame[] | null; recarregar: () => void } {
  const [sessoes, setSessoes] = useState<SessaoExame[] | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let cancelado = false
    listarSessoes().then((s) => {
      if (!cancelado) setSessoes(s)
    })
    return () => {
      cancelado = true
    }
  }, [versao])

  return { sessoes, recarregar: () => setVersao((v) => v + 1) }
}

/** Uma sessão específica. `undefined` = não encontrada; `null` = ainda carregando. */
export function useSessao(id: string): { sessao: SessaoExame | null | undefined; recarregar: () => void } {
  const [sessao, setSessao] = useState<SessaoExame | null | undefined>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let cancelado = false
    setSessao(null)
    obterSessao(id).then((s) => {
      if (!cancelado) setSessao(s)
    })
    return () => {
      cancelado = true
    }
  }, [id, versao])

  return { sessao, recarregar: () => setVersao((v) => v + 1) }
}
