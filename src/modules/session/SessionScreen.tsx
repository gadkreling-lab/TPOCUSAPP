import { Link, useLocation } from 'wouter'
import { useSessoes } from '../../storage/hooks'
import { novaSessao } from '../../storage/sessao'
import { salvarSessao } from '../../storage/db'
import { definirSessaoAtivaId } from '../../storage/sessaoAtiva'
import { Button } from '../../ui/Button'

/**
 * Lista das sessões de exame salvas neste aparelho (Módulo 4, Fase 6). Dado do aluno,
 * não do curso — vive só em IndexedDB local, funciona 100% offline (ARQUITETURA.md §4).
 */
export function SessionScreen() {
  const { sessoes } = useSessoes()
  const [, navegar] = useLocation()

  async function onNovaSessao() {
    const sessao = novaSessao()
    await salvarSessao(sessao)
    definirSessaoAtivaId(sessao.id)
    navegar(`/sessao/${sessao.id}`)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-fg">Sessão de exame</h1>
      <p className="mt-1 text-sm text-muted">
        Resultados de calculadoras e conclusões de protocolo que você salvar aparecem aqui, só neste aparelho.
      </p>

      <Button bloco onClick={onNovaSessao} className="mt-4">
        + Nova sessão
      </Button>

      {sessoes === null && <p className="mt-4 text-base text-muted">Carregando…</p>}

      {sessoes && sessoes.length === 0 && (
        <p className="mt-4 text-base text-muted">
          Nenhuma sessão salva ainda. Um "+ Adicionar à sessão" numa calculadora ou num protocolo cria uma
          automaticamente, ou toque em "Nova sessão" acima.
        </p>
      )}

      {sessoes && sessoes.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
          {sessoes.map((s) => (
            <li key={s.id}>
              <Link href={`/sessao/${s.id}`} className="flex min-h-touch items-center justify-between gap-3 p-3 text-fg">
                <div>
                  <p className="text-base font-medium">{s.titulo}</p>
                  <p className="text-sm text-muted">
                    {s.entradas.length} {s.entradas.length === 1 ? 'item' : 'itens'} ·{' '}
                    {new Date(s.atualizadoEm).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span aria-hidden="true" className="shrink-0 text-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
