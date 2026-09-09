import { useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { useSessao } from '../../storage/hooks'
import { comTitulo, entradaEvolucao, semEntrada } from '../../storage/sessao'
import { excluirSessao, salvarSessao } from '../../storage/db'
import { definirSessaoAtivaId, obterSessaoAtivaId } from '../../storage/sessaoAtiva'
import { formatarSessaoParaTexto } from '../../storage/exportar'
import type { EntradaSessao } from '../../storage/tipos'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'

export function SessionDetailScreen() {
  const params = useParams<{ id: string }>()
  const { sessao, recarregar } = useSessao(params.id)
  const [, navegar] = useLocation()

  if (sessao === null) {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando sessão…</p>
      </div>
    )
  }
  if (sessao === undefined) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-base text-alterado">Sessão não encontrada.</p>
        <Link href="/sessao" className="text-accent underline">
          ‹ Sessões
        </Link>
      </div>
    )
  }

  return <DetalheSessao key={sessao.id} sessaoInicial={sessao} recarregar={recarregar} navegar={navegar} />
}

function DetalheSessao({
  sessaoInicial,
  recarregar,
  navegar,
}: {
  sessaoInicial: NonNullable<ReturnType<typeof useSessao>['sessao']>
  recarregar: () => void
  navegar: (href: string) => void
}) {
  const sessao = sessaoInicial
  const [titulo, setTitulo] = useState(sessao.titulo)
  const [textoEvolucao, setTextoEvolucao] = useState('')
  const [copiado, setCopiado] = useState(false)
  const ativa = obterSessaoAtivaId() === sessao.id

  async function onSalvarTitulo() {
    if (titulo.trim() === sessao.titulo) return
    await salvarSessao(comTitulo(sessao, titulo.trim() || 'Sessão sem título'))
    recarregar()
  }

  async function onAdicionarEvolucao() {
    if (!textoEvolucao.trim()) return
    const atualizada = { ...sessao, entradas: [...sessao.entradas, entradaEvolucao(textoEvolucao.trim())] }
    await salvarSessao(atualizada)
    setTextoEvolucao('')
    recarregar()
  }

  async function onRemoverEntrada(entradaId: string) {
    await salvarSessao(semEntrada(sessao, entradaId))
    recarregar()
  }

  async function onExcluirSessao() {
    if (!window.confirm('Excluir esta sessão? Isso não pode ser desfeito.')) return
    await excluirSessao(sessao.id)
    navegar('/sessao')
  }

  function onTornarAtiva() {
    definirSessaoAtivaId(sessao.id)
    recarregar()
  }

  async function onExportar() {
    const texto = formatarSessaoParaTexto(sessao)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // sem permissão/API de clipboard — mostra o texto pra copiar manualmente.
      window.prompt('Copie o texto abaixo:', texto)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link href="/sessao" className="text-sm text-accent underline">
          ‹ Sessões
        </Link>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={onSalvarTitulo}
          aria-label="Título da sessão"
          className="mt-1 block w-full rounded-lg border border-transparent bg-transparent px-0 text-xl font-semibold text-fg focus:border-border focus:bg-surface focus:px-2"
        />
        <p className="text-xs text-muted">Use um rótulo neutro (ex.: "Leito 4") — evite nome ou dado que identifique o paciente.</p>
        {ativa ? (
          <span className="mt-1 inline-block rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent">
            Sessão ativa — recebe os próximos "Adicionar à sessão"
          </span>
        ) : (
          <button onClick={onTornarAtiva} className="mt-1 text-xs text-accent underline">
            Tornar esta a sessão ativa
          </button>
        )}
      </div>

      {sessao.entradas.length === 0 ? (
        <p className="text-base text-muted">
          Nenhum item ainda. Adicione um resultado numa calculadora ou uma conclusão de protocolo.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessao.entradas.map((e) => (
            <li key={e.id}>
              <EntradaCard entrada={e} onRemover={() => onRemoverEntrada(e.id)} />
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-muted">Adicionar texto de evolução</p>
        <textarea
          value={textoEvolucao}
          onChange={(e) => setTextoEvolucao(e.target.value)}
          rows={3}
          placeholder="Anotação livre para esta sessão…"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base text-fg placeholder:text-muted"
        />
        <Button variante="secundario" onClick={onAdicionarEvolucao} disabled={!textoEvolucao.trim()}>
          Adicionar
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onExportar}>{copiado ? 'Copiado!' : 'Exportar (copiar texto)'}</Button>
        <Button variante="perigo" onClick={onExcluirSessao}>
          Excluir sessão
        </Button>
      </div>
    </div>
  )
}

function EntradaCard({ entrada, onRemover }: { entrada: EntradaSessao; onRemover: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {entrada.tipo === 'calculadora' && (
            <>
              <p className="text-sm text-muted">{entrada.calculadoraNome}</p>
              <p className="text-base font-medium text-fg">
                {entrada.label}: {entrada.valor} {entrada.unidade}
              </p>
              <p className="text-sm text-fg">{entrada.texto}</p>
              {entrada.severidade && (
                <span className="mt-1 inline-block">
                  <Badge severidade={entrada.severidade} />
                </span>
              )}
            </>
          )}
          {entrada.tipo === 'protocolo' && (
            <>
              <p className="text-sm text-muted">Protocolo {entrada.protocoloNome}</p>
              <p className="text-base font-medium text-fg">
                {Array.isArray(entrada.diagnostico) ? entrada.diagnostico.join(' + ') : entrada.diagnostico}
              </p>
              <p className="text-sm text-fg">{entrada.justificativa}</p>
            </>
          )}
          {entrada.tipo === 'evolucao' && (
            <>
              <p className="text-sm text-muted">Evolução</p>
              <p className="whitespace-pre-wrap text-base text-fg">{entrada.texto}</p>
            </>
          )}
          <p className="mt-1 text-xs text-muted">{new Date(entrada.criadoEm).toLocaleString('pt-BR')}</p>
        </div>
        <button
          onClick={onRemover}
          aria-label="Remover item"
          className="min-h-touch min-w-touch shrink-0 text-muted hover:text-alterado"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
