import { useEffect, useState, type FormEvent } from 'react'
import { estenderPrazo, gerarCodigos, listarCodigos, revogarCodigo, type CodigoComStatus } from './api'
import { Button } from '../ui/Button'

const ROTULO_STATUS: Record<CodigoComStatus['status'], string> = {
  nao_ativado: 'Não ativado',
  ativo: 'Ativo',
  expirado: 'Expirado',
  revogado: 'Revogado',
}

const COR_STATUS: Record<CodigoComStatus['status'], string> = {
  nao_ativado: 'border-border bg-border/30 text-muted',
  ativo: 'border-normal/40 bg-normal/15 text-normal',
  expirado: 'border-limitrofe/40 bg-limitrofe/15 text-limitrofe',
  revogado: 'border-alterado/40 bg-alterado/15 text-alterado',
}

export function AdminCodigosScreen() {
  const [codigos, setCodigos] = useState<CodigoComStatus[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState(10)
  const [duracaoDias, setDuracaoDias] = useState(180)
  const [gerando, setGerando] = useState(false)
  const [ultimoLote, setUltimoLote] = useState<string[] | null>(null)

  async function carregar() {
    try {
      setCodigos(await listarCodigos())
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar códigos.')
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function onGerar(e: FormEvent) {
    e.preventDefault()
    setGerando(true)
    setErro(null)
    try {
      setUltimoLote(await gerarCodigos(quantidade, duracaoDias))
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar códigos.')
    } finally {
      setGerando(false)
    }
  }

  async function onRevogar(codigo: string) {
    if (!window.confirm(`Revogar o código ${codigo}? O aluno perde acesso em até ~15 minutos.`)) return
    try {
      await revogarCodigo(codigo)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao revogar.')
    }
  }

  async function onEstender(codigo: string) {
    const texto = window.prompt('Estender em quantos dias? (um número negativo reduz o prazo)')
    if (!texto) return
    const dias = Number(texto)
    if (!Number.isInteger(dias) || dias === 0) return
    try {
      await estenderPrazo(codigo, dias)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao estender prazo.')
    }
  }

  async function onCopiarLote() {
    if (!ultimoLote) return
    const texto = ultimoLote.join('\n')
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      window.prompt('Copie os códigos abaixo:', texto)
    }
  }

  return (
    <div className="space-y-6 p-4">
      <form onSubmit={onGerar} className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-muted">Gerar novos códigos</p>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="text-sm text-muted">Quantidade</span>
            <input
              type="number"
              min={1}
              max={200}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="mt-1 min-h-touch w-full rounded-lg border border-border bg-bg px-3 text-base text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="flex-1">
            <span className="text-sm text-muted">Duração (dias)</span>
            <input
              type="number"
              min={1}
              value={duracaoDias}
              onChange={(e) => setDuracaoDias(Number(e.target.value))}
              className="mt-1 min-h-touch w-full rounded-lg border border-border bg-bg px-3 text-base text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
        <Button type="submit" bloco disabled={gerando || quantidade < 1 || duracaoDias < 1}>
          {gerando ? 'Gerando…' : `Gerar ${quantidade || 0} código(s)`}
        </Button>
      </form>

      {ultimoLote && (
        <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm font-semibold text-fg">{ultimoLote.length} código(s) gerado(s) agora:</p>
          <p className="break-all font-mono text-sm text-fg">{ultimoLote.join(', ')}</p>
          <Button variante="secundario" onClick={onCopiarLote} className="px-3 text-sm">
            Copiar lista
          </Button>
        </div>
      )}

      {erro && (
        <p role="alert" className="text-sm text-alterado">
          {erro}
        </p>
      )}

      <div>
        <p className="text-sm font-semibold text-muted">Códigos {codigos ? `(${codigos.length})` : ''}</p>
        {codigos === null && <p className="mt-2 text-base text-muted">Carregando…</p>}
        {codigos && codigos.length === 0 && <p className="mt-2 text-base text-muted">Nenhum código gerado ainda.</p>}
        {codigos && codigos.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
            {codigos.map((c) => (
              <li key={c.codigo} className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-medium text-fg">{c.codigo}</span>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${COR_STATUS[c.status]}`}>
                    {ROTULO_STATUS[c.status]}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {c.duracaoDias} dias{c.expiraEm && ` · expira em ${new Date(c.expiraEm * 1000).toLocaleDateString('pt-BR')}`}
                </p>
                {c.status !== 'revogado' && (
                  <div className="flex gap-2">
                    <Button variante="secundario" onClick={() => onRevogar(c.codigo)} className="px-3 text-sm">
                      Revogar
                    </Button>
                    {c.expiraEm != null && (
                      <Button variante="secundario" onClick={() => onEstender(c.codigo)} className="px-3 text-sm">
                        Estender prazo
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
