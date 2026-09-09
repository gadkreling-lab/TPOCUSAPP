import { useState } from 'react'
import { obterSenhaAdmin, limparSenhaAdmin } from './senha'
import { AdminLoginScreen } from './AdminLoginScreen'
import { AdminCodigosScreen } from './AdminCodigosScreen'

/**
 * Raiz da tela administrativa (`/admin`) — deliberadamente FORA da árvore de
 * SessionProvider/DisclaimerGate/Shell do aluno (App.tsx decide o branch antes de
 * montar qualquer uma das duas). Credencial e propósito diferentes: quem gera/revoga
 * código não precisa aceitar o disclaimer clínico nem ver a tab bar dos 4 módulos.
 */
export function AdminApp() {
  const [autenticado, setAutenticado] = useState(() => obterSenhaAdmin() !== null)

  if (!autenticado) {
    return <AdminLoginScreen onEntrar={() => setAutenticado(true)} />
  }

  function onSair() {
    limparSenhaAdmin()
    setAutenticado(false)
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-lg font-semibold text-fg">TPOCUS — Administração</span>
        <button onClick={onSair} className="min-h-touch px-2 text-sm text-accent underline">
          Sair
        </button>
      </header>
      <AdminCodigosScreen />
    </div>
  )
}
