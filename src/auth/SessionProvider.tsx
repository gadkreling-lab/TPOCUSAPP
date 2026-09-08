import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { obterDeviceId } from './deviceId'
import { carregarSessao, expDoToken, limparSessao, salvarSessao, type SessaoPersistida } from './sessionStore'
import { ativarCodigo as ativarCodigoApi, renovarSessao as renovarSessaoApi } from './api'

export type StatusSessao = 'carregando' | 'bloqueado' | 'autenticado'

interface SessionContextValue {
  status: StatusSessao
  mensagemBloqueio: string | null
  ativar: (codigo: string) => Promise<{ ok: boolean; mensagem?: string }>
  /** Token de acesso pronto para uso — renova sozinho se necessário. null = sessão inválida. */
  obterTokenAcesso: () => Promise<string | null>
}

const SessionContext = createContext<SessionContextValue | null>(null)

// Margem de segurança: renova um pouco antes do token expirar de verdade, para uma
// chamada de conteúdo não correr o risco de usar um token que expira no meio do
// caminho até o servidor.
const MARGEM_SEGUNDOS = 45

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusSessao>('carregando')
  const [mensagemBloqueio, setMensagemBloqueio] = useState<string | null>(null)
  const sessaoRef = useRef<SessaoPersistida | null>(null)
  const renovacaoEmAndamento = useRef<Promise<string | null> | null>(null)

  const deviceId = useMemo(() => obterDeviceId(), [])

  function entrarBloqueado(mensagem: string | null) {
    limparSessao()
    sessaoRef.current = null
    setMensagemBloqueio(mensagem)
    setStatus('bloqueado')
  }

  function entrarAutenticado(sessao: SessaoPersistida) {
    sessaoRef.current = sessao
    salvarSessao(sessao)
    setMensagemBloqueio(null)
    setStatus('autenticado')
  }

  async function renovar(tokenRenovacao: string): Promise<string | null> {
    const resultado = await renovarSessaoApi(tokenRenovacao)
    if (!resultado.ok) {
      entrarBloqueado(resultado.erro.mensagem)
      return null
    }
    entrarAutenticado(resultado.sessao)
    return resultado.sessao.tokenAcesso
  }

  // Ao montar: usa a sessão persistida se o token de acesso ainda tiver folga;
  // senão tenta renovar (o que já exige rede — sem offline, ver ARQUITETURA.md §4).
  useEffect(() => {
    const persistida = carregarSessao()
    if (!persistida) {
      setStatus('bloqueado')
      return
    }
    sessaoRef.current = persistida
    const exp = expDoToken(persistida.tokenAcesso)
    const agora = Math.floor(Date.now() / 1000)
    if (exp && exp - agora > MARGEM_SEGUNDOS) {
      setStatus('autenticado')
      return
    }
    void renovar(persistida.tokenRenovacao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function ativar(codigo: string): Promise<{ ok: boolean; mensagem?: string }> {
    const resultado = await ativarCodigoApi(codigo.trim(), deviceId)
    if (!resultado.ok) {
      return { ok: false, mensagem: resultado.erro.mensagem }
    }
    entrarAutenticado(resultado.sessao)
    return { ok: true }
  }

  async function obterTokenAcesso(): Promise<string | null> {
    const sessao = sessaoRef.current
    if (!sessao) return null

    const agora = Math.floor(Date.now() / 1000)
    const exp = expDoToken(sessao.tokenAcesso)
    if (exp && exp - agora > MARGEM_SEGUNDOS) {
      return sessao.tokenAcesso
    }

    // Evita duas renovações simultâneas se várias telas pedirem conteúdo ao mesmo tempo.
    if (!renovacaoEmAndamento.current) {
      renovacaoEmAndamento.current = renovar(sessao.tokenRenovacao).finally(() => {
        renovacaoEmAndamento.current = null
      })
    }
    return renovacaoEmAndamento.current
  }

  const value: SessionContextValue = { status, mensagemBloqueio, ativar, obterTokenAcesso }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessao(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessao precisa estar dentro de <SessionProvider>')
  return ctx
}
