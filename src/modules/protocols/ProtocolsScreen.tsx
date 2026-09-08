import { Link } from 'wouter'
import { useProtocolFlows, useProtocols } from '../../queries/hooks'
import { PageRef } from '../../ui/PageRef'

/**
 * Lista dos 4 protocolos guiados (Módulo 3). BLUE e CASA ganham execução guiada na
 * Fase 4 (BLUE depende da Figura 16 já transcrita; CASA é rascunho pendente de
 * validação clínica — ver VALIDACAO-CLINICA.md) — por ora aparecem na lista, com
 * conteúdo descritivo, mas sem fluxo interativo. E-FAST e RUSH são executáveis aqui.
 */
export function ProtocolsScreen() {
  const estadoProtocolos = useProtocols()
  const estadoFlows = useProtocolFlows()

  if (estadoProtocolos.status === 'carregando' || estadoFlows.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando protocolos…</p>
      </div>
    )
  }

  const erro = estadoProtocolos.status === 'erro' ? estadoProtocolos.erro : estadoFlows.status === 'erro' ? estadoFlows.erro : null
  if (erro) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-fg">Protocolos</h1>
        <p role="alert" className="mt-2 text-base text-alterado">
          {erro.message}
        </p>
      </div>
    )
  }

  if (estadoProtocolos.status !== 'pronto' || estadoFlows.status !== 'pronto') return null

  const idsExecutaveis = new Set(estadoFlows.dados.map((f) => f.id))

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-fg">Protocolos</h1>
      <p className="mt-1 text-sm text-muted">Exame guiado, passo a passo, com conclusão interpretada.</p>

      <ul className="mt-4 space-y-2">
        {estadoProtocolos.dados.map((p) => {
          const executavel = idsExecutaveis.has(p.id)
          const conteudo = (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-medium text-fg">{p.nome}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <PageRef paginaEbook={p.paginaEbook} paginasEbook={p.paginasEbook} />
                  {p.status === 'pendente_validacao' && (
                    <span className="rounded-md border border-limitrofe/40 bg-limitrofe/15 px-2 py-0.5 text-xs font-medium text-limitrofe">
                      Rascunho — pendente de validação clínica
                    </span>
                  )}
                  {!executavel && (
                    <span className="rounded-md border border-border bg-border/30 px-2 py-0.5 text-xs text-muted">
                      Exame guiado em breve
                    </span>
                  )}
                </div>
              </div>
              {executavel && (
                <span aria-hidden="true" className="text-muted">
                  ›
                </span>
              )}
            </div>
          )
          return (
            <li key={p.id}>
              {executavel ? (
                <Link
                  href={`/protocolos/${p.id}`}
                  className="block min-h-touch rounded-xl border border-border bg-surface px-4 py-3 text-fg"
                >
                  {conteudo}
                </Link>
              ) : (
                <div className="rounded-xl border border-border bg-surface px-4 py-3 opacity-70">{conteudo}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
