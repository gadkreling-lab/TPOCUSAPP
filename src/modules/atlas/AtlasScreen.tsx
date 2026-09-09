import { useState } from 'react'
import { Link } from 'wouter'
import type { Categoria, Finding, GlossaryEntry, Measurement, Pathology, Window } from '../../content/types'
import { useFindings, useGlossary, useMeasurements, usePathologies, useWindows } from '../../queries/hooks'
import type { EstadoConteudo } from '../../queries/useConteudo'
import { PageRef } from '../../ui/PageRef'
import { SourceTag } from '../../ui/SourceTag'
import { buscar, totalResultados } from './busca'

const ROTULO_CATEGORIA: Record<Categoria, string> = {
  cardiaca: 'Cardíaca',
  pulmonar: 'Pulmonar',
  vascular: 'Vascular',
  abdominal: 'Abdominal / E-FAST',
}

const ORDEM_CATEGORIA: Categoria[] = ['cardiaca', 'pulmonar', 'vascular', 'abdominal']

// Ids de measurements.json que têm uma calculadora correspondente (Módulo 2) —
// correspondência direta de id, não inventada; os demais measurements não têm link.
const IDS_CALCULADORAS = new Set(['epss', 'mapse', 'tapse', 'debito-cardiaco', 'vci-responsividade', 'derrame-pleural'])

function dadosOuVazio<T>(estado: EstadoConteudo<T[]>): T[] {
  return estado.status === 'pronto' ? estado.dados : []
}

/**
 * Atlas de Janelas + busca global (Fase 5). A busca cruza os 5 arquivos de conteúdo de
 * referência ao mesmo tempo (src/modules/atlas/busca.ts) — o aluno não precisa saber
 * se "derrame pericárdico" é uma janela, um achado ou um termo do glossário.
 */
export function AtlasScreen() {
  const estadoWindows = useWindows()
  const estadoFindings = useFindings()
  const estadoPathologies = usePathologies()
  const estadoMeasurements = useMeasurements()
  const estadoGlossary = useGlossary()
  const [query, setQuery] = useState('')

  if (estadoWindows.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando janelas…</p>
      </div>
    )
  }

  if (estadoWindows.status === 'erro') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-fg">Atlas de Janelas</h1>
        <p role="alert" className="mt-2 text-base text-alterado">
          {estadoWindows.erro.message}
        </p>
      </div>
    )
  }

  const janelas = estadoWindows.dados
  const resultado = buscar(query, {
    windows: janelas,
    findings: dadosOuVazio(estadoFindings),
    pathologies: dadosOuVazio(estadoPathologies),
    measurements: dadosOuVazio(estadoMeasurements),
    glossary: dadosOuVazio(estadoGlossary),
  })

  const buscando = query.trim().length > 0
  const janelasExibidas = buscando ? resultado.windows : janelas

  const porCategoria = new Map<Categoria, Window[]>()
  for (const janela of janelasExibidas) {
    const lista = porCategoria.get(janela.categoria) ?? []
    lista.push(janela)
    porCategoria.set(janela.categoria, lista)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-fg">Atlas de Janelas</h1>
      <p className="mt-1 text-sm text-muted">{janelas.length} janelas de aquisição</p>

      <label className="mt-4 block">
        <span className="sr-only">Buscar janela, achado, patologia, medida ou termo</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar janela, achado, patologia, medida ou termo…"
          className="min-h-touch w-full rounded-xl border border-border bg-surface px-4 text-base text-fg placeholder:text-muted"
        />
      </label>

      {buscando && totalResultados(resultado) === 0 && (
        <p className="mt-4 text-base text-muted">Nada encontrado para "{query}".</p>
      )}

      <div className="mt-4 space-y-6">
        {ORDEM_CATEGORIA.filter((c) => porCategoria.has(c)).map((categoria) => (
          <section key={categoria}>
            <h2 className="text-base font-semibold text-muted">{ROTULO_CATEGORIA[categoria]}</h2>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
              {porCategoria.get(categoria)!.map((janela) => (
                <li key={janela.id}>
                  <Link
                    href={`/janelas/${janela.id}`}
                    className="flex min-h-touch items-center justify-between gap-3 p-3 text-fg"
                  >
                    <div>
                      <p className="text-base font-medium text-fg">{janela.nome}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <PageRef paginaEbook={janela.paginaEbook} paginasEbook={janela.paginasEbook} />
                        {janela.fonteExterna && <SourceTag fonte={janela.fonteExterna} />}
                      </div>
                    </div>
                    <span aria-hidden="true" className="shrink-0 text-muted">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {buscando && (
          <>
            <SecaoBusca titulo="Achados" itens={resultado.findings} render={(f) => <FindingResumo finding={f} />} />
            <SecaoBusca titulo="Patologias" itens={resultado.pathologies} render={(p) => <PathologyResumo pathology={p} />} />
            <SecaoBusca titulo="Medidas" itens={resultado.measurements} render={(m) => <MeasurementResumo measurement={m} />} />
            <SecaoBusca titulo="Glossário" itens={resultado.glossary} render={(g) => <GlossaryResumo entry={g} />} />
          </>
        )}
      </div>
    </div>
  )
}

function SecaoBusca<T>({ titulo, itens, render }: { titulo: string; itens: T[]; render: (item: T) => React.ReactNode }) {
  if (itens.length === 0) return null
  return (
    <section>
      <h2 className="text-base font-semibold text-muted">{titulo}</h2>
      <ul className="mt-2 space-y-2">
        {itens.map((item, i) => (
          <li key={i}>{render(item)}</li>
        ))}
      </ul>
    </section>
  )
}

function FindingResumo({ finding }: { finding: Finding }) {
  return (
    <details className="rounded-xl border border-border bg-surface p-3">
      <summary className="min-h-touch cursor-pointer text-base font-medium text-fg">
        {finding.nome}
        <span className="ml-2 align-middle">
          <PageRef paginaEbook={finding.paginaEbook} paginasEbook={finding.paginasEbook} />
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-base text-fg">
        {finding.fonteExterna && <SourceTag fonte={finding.fonteExterna} />}
        <p>{finding.descricao}</p>
        <p className="text-muted">{finding.significadoClinico}</p>
      </div>
    </details>
  )
}

function PathologyResumo({ pathology }: { pathology: Pathology }) {
  return (
    <details className="rounded-xl border border-border bg-surface p-3">
      <summary className="min-h-touch cursor-pointer text-base font-medium text-fg">
        {pathology.nome}
        <span className="ml-2 align-middle">
          <PageRef paginaEbook={pathology.paginaEbook} paginasEbook={pathology.paginasEbook} />
        </span>
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-fg">
        {pathology.achados.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </details>
  )
}

function MeasurementResumo({ measurement }: { measurement: Measurement }) {
  const temCalculadora = IDS_CALCULADORAS.has(measurement.id)
  return (
    <details className="rounded-xl border border-border bg-surface p-3">
      <summary className="min-h-touch cursor-pointer text-base font-medium text-fg">
        {measurement.nome}
        <span className="ml-2 align-middle">
          <PageRef paginaEbook={measurement.paginaEbook} paginasEbook={measurement.paginasEbook} />
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-base text-fg">
        <p className="text-muted">Unidade: {measurement.unidades}</p>
        {temCalculadora && (
          <Link href={`/calculadoras/${measurement.id}`} className="text-accent underline">
            Ver na calculadora
          </Link>
        )}
      </div>
    </details>
  )
}

function GlossaryResumo({ entry }: { entry: GlossaryEntry }) {
  return (
    <details className="rounded-xl border border-border bg-surface p-3">
      <summary className="min-h-touch cursor-pointer text-base font-medium text-fg">
        {entry.termo}
        {entry.sigla !== '—' && <span className="text-muted"> ({entry.sigla})</span>}
      </summary>
      <div className="mt-2 space-y-2 text-base text-fg">
        {entry.fonteExterna && <SourceTag fonte={entry.fonteExterna} />}
        <p>{entry.definicao}</p>
      </div>
    </details>
  )
}
