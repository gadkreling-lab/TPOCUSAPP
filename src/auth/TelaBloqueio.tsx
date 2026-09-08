import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { useSessao } from './SessionProvider'

/**
 * Tela de bloqueio — primeira coisa que o aluno vê sem sessão válida. Pede só o
 * código de acesso: nenhum nome, e-mail ou dado pessoal (Regra de sessão anônima do
 * Módulo 4, ver ARQUITETURA.md §6).
 */
export function TelaBloqueio() {
  const { ativar, mensagemBloqueio } = useSessao()
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    setEnviando(true)
    setErro(null)
    const resultado = await ativar(codigo)
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.mensagem ?? 'Não foi possível ativar o código.')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-fg">TPOCUS</h1>
        <p className="mt-1 text-base text-muted">
          Treinamento Prático em Ultrassom Point of Care
        </p>

        <form onSubmit={aoEnviar} className="mt-8 space-y-4">
          <div>
            <label htmlFor="codigo-acesso" className="block text-base font-medium text-fg">
              Código de acesso
            </label>
            <input
              id="codigo-acesso"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Digite o código do curso"
              className="mt-1.5 min-h-touch w-full rounded-xl border border-border bg-surface px-3 text-lg tracking-wide text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              disabled={enviando}
            />
          </div>

          {(erro ?? mensagemBloqueio) && (
            <p role="alert" className="text-sm text-alterado">
              {erro ?? mensagemBloqueio}
            </p>
          )}

          <Button type="submit" bloco disabled={enviando || !codigo.trim()}>
            {enviando ? 'Verificando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-8 text-sm text-muted">
          Ferramenta exclusiva para alunos matriculados no curso. Precisa de conexão com
          a internet para ativar o acesso e, periodicamente, para renovar a sessão.
        </p>
      </div>
    </div>
  )
}
