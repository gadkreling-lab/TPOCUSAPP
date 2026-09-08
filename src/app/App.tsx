import { SessionProvider, useSessao } from '../auth/SessionProvider'
import { TelaBloqueio } from '../auth/TelaBloqueio'
import { DisclaimerGate } from './DisclaimerGate'
import { Shell } from './Shell'

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
  return (
    <SessionProvider>
      <Conteudo />
    </SessionProvider>
  )
}
