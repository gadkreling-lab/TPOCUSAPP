import { useLocation } from 'wouter'
import { SessionProvider, useSessao } from '../auth/SessionProvider'
import { TelaBloqueio } from '../auth/TelaBloqueio'
import { DisclaimerGate } from './DisclaimerGate'
import { Shell } from './Shell'
import { AdminApp } from '../admin/AdminApp'

function Conteudo() {
  const { status } = useSessao()

  if (status === 'carregando') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-base text-muted">Carregando…</p>
      </div>
    )
  }

  if (status === 'bloqueado') {
    return <TelaBloqueio />
  }

  return (
    <DisclaimerGate>
      <Shell />
    </DisclaimerGate>
  )
}

export default function App() {
  const [localizacao] = useLocation()

  // /admin fica FORA do fluxo do aluno de propósito — outra credencial, sem
  // disclaimer clínico nem tab bar dos 4 módulos (ver src/admin/AdminApp.tsx).
  if (localizacao.startsWith('/admin')) {
    return <AdminApp />
  }

  return (
    <SessionProvider>
      <Conteudo />
    </SessionProvider>
  )
}
