import { useState, type FormEvent } from 'react'
import { login } from './api'
import { definirSenhaAdmin } from './senha'
import { Button } from '../ui/Button'

export function AdminLoginScreen({ onEntrar }: { onEntrar: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      // trim: mesma tolerância a espaço/quebra de linha acidental do lado do servidor
      // (api/_lib/adminAuth.ts) — evita guardar em sessionStorage uma senha com um
      // caractere a mais que o login já aceitou, o que quebraria as chamadas
      // administrativas seguintes (cada uma reenvia isso como Bearer).
      const senhaLimpa = senha.trim()
      await login(senhaLimpa)
      definirSenhaAdmin(senhaLimpa)
      onEntrar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <h1 className="text-xl font-semibold text-fg">Administração TPOCUS</h1>
          <p className="mt-1 text-sm text-muted">Geração e revogação de códigos de acesso do curso.</p>
        </div>
        <label className="block">
          <span className="text-sm text-muted">Senha de administrador</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-1 min-h-touch w-full rounded-lg border border-border bg-bg px-3 text-base text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
        {erro && (
          <p role="alert" className="text-sm text-alterado">
            {erro}
          </p>
        )}
        <Button type="submit" bloco disabled={!senha || carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
