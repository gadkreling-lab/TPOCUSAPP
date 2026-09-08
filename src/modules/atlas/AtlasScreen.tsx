import type { Categoria, Window } from '../../content/types'
import { useWindows } from '../../queries/hooks'
import { PageRef } from '../../ui/PageRef'
import { SourceTag } from '../../ui/SourceTag'

const ROTULO_CATEGORIA: Record<Categoria, string> = {
  cardiaca: 'Cardíaca',
  pulmonar: 'Pulmonar',
  vascular: 'Vascular',
  abdominal: 'Abdominal / E-FAST',
}

const ORDEM_CATEGORIA: Categoria[] = ['cardiaca', 'pulmonar', 'vascular', 'abdominal']

/**
 * Atlas de Janelas — Fase 1 entrega a lista funcional (busca autenticada, agrupada
 * por categoria, com rastreabilidade de página e selo de fonte externa). Busca por
 * achado/patologia e as telas de detalhe completas (como pegar a janela, erros
 * comuns) ficam para a Fase 5.
 */
export function AtlasScreen() {
  const estado = useWindows()

  if (estado.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando janelas…</p>
      </div>
    )
  }

  if (estado.status === 'erro') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-fg">Atlas de Janelas</h1>
        <p role="alert" className="mt-2 text-base text-alterado">
          {estado.erro.message}
        </p>
      </div>
    )
  }

  const porCategoria = new Map<Categoria, Window[]>()
  for (const janela of estado.dados) {
    const lista = porCategoria.get(janela.categoria) ?? []
    lista.push(janela)
    porCategoria.set(janela.categoria, lista)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-fg">Atlas de Janelas</h1>
      <p className="mt-1 text-sm text-muted">{estado.dados.length} janelas de aquisição</p>

      <div className="mt-4 space-y-6">
        {ORDEM_CATEGORIA.filter((c) => porCategoria.has(c)).map((categoria) => (
          <section key={categoria}>
            <h2 className="text-base font-semibold text-muted">{ROTULO_CATEGORIA[categoria]}</h2>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
              {porCategoria.get(categoria)!.map((janela) => (
                <li key={janela.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-base font-medium text-fg">{janela.nome}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <PageRef paginaEbook={janela.paginaEbook} paginasEbook={janela.paginasEbook} />
                      {janela.fonteExterna && <SourceTag fonte={janela.fonteExterna} />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
