import type { ReactNode } from 'react'
import { Link, useParams } from 'wouter'
import type { Categoria, Transdutor } from '../../content/types'
import { useImagemUrl, useImagesCatalog, useWindows } from '../../queries/hooks'
import { PageRef } from '../../ui/PageRef'
import { SourceTag } from '../../ui/SourceTag'

const ROTULO_CATEGORIA: Record<Categoria, string> = {
  cardiaca: 'Cardíaca',
  pulmonar: 'Pulmonar',
  vascular: 'Vascular',
  abdominal: 'Abdominal / E-FAST',
}

const ROTULO_TRANSDUTOR: Record<Transdutor, string> = {
  setorial: 'Setorial (phased array)',
  linear: 'Linear',
  convexo: 'Convexo',
}

/**
 * Detalhe completo de uma janela — Fase 5 ("Atlas completo"). Todos os campos de
 * `Window` que existirem são mostrados; `null`/ausente nunca é preenchido, só
 * escondido (CLAUDE.md Regra 3).
 */
export function WindowDetailScreen() {
  const params = useParams<{ id: string }>()
  const estadoWindows = useWindows()
  const estadoImagens = useImagesCatalog()

  if (estadoWindows.status === 'carregando' || estadoImagens.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando janela…</p>
      </div>
    )
  }
  const erro = estadoWindows.status === 'erro' ? estadoWindows.erro : estadoImagens.status === 'erro' ? estadoImagens.erro : null
  if (erro) {
    return (
      <div className="p-4">
        <p role="alert" className="text-base text-alterado">
          {erro.message}
        </p>
      </div>
    )
  }
  if (estadoWindows.status !== 'pronto' || estadoImagens.status !== 'pronto') return null

  const janela = estadoWindows.dados.find((w) => w.id === params.id)
  if (!janela) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-base text-alterado">Janela não encontrada.</p>
        <Link href="/" className="text-accent underline">
          ‹ Atlas
        </Link>
      </div>
    )
  }

  const imagens = estadoImagens.dados.filter((im) => im.windowIds.includes(janela.id))
  const nomesJanela = new Map(estadoWindows.dados.map((w) => [w.id, w.nome]))

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link href="/" className="text-sm text-accent underline">
          ‹ Atlas
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-fg">{janela.nome}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-border bg-border/30 px-2 py-0.5 text-xs text-muted">
            {ROTULO_CATEGORIA[janela.categoria]}
          </span>
          <PageRef paginaEbook={janela.paginaEbook} paginasEbook={janela.paginasEbook} />
          {janela.fonteExterna && <SourceTag fonte={janela.fonteExterna} />}
        </div>
      </div>

      {imagens.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {imagens.map((im) => (
            <ImagemJanela key={im.id} arquivo={im.arquivo} legenda={im.legendaEbook ?? im.secaoEbook} />
          ))}
        </div>
      )}

      <Secao titulo="Transdutor">
        <p className="text-base text-fg">{ROTULO_TRANSDUTOR[janela.transdutor]}</p>
        {janela.transdutorAlternativo && <p className="mt-0.5 text-sm text-muted">Alternativo: {janela.transdutorAlternativo}</p>}
      </Secao>

      <Secao titulo="Posição do paciente">
        <p className="text-base text-fg">{janela.posicaoPaciente}</p>
      </Secao>

      {(janela.posicaoTransdutor || janela.posicaoTransdutorDetalhada) && (
        <Secao titulo="Posição do transdutor">
          {janela.posicaoTransdutor && <p className="text-base text-fg">{janela.posicaoTransdutor}</p>}
          {janela.posicaoTransdutorDetalhada && (
            <p className="mt-1 text-sm text-muted">{janela.posicaoTransdutorDetalhada}</p>
          )}
        </Secao>
      )}

      <Secao titulo="Marcador">
        <p className="text-base text-fg">{janela.marcador}</p>
      </Secao>

      {janela.profundidade && (
        <Secao titulo="Profundidade">
          <p className="text-base text-fg">{janela.profundidade}</p>
        </Secao>
      )}

      <ListaSecao titulo="Estruturas visualizadas" itens={janela.estruturasVisualizadas} />
      <ListaSecao titulo="O que avaliar" itens={janela.oQueAvaliar} />
      <ListaSecao titulo="Como otimizar" itens={janela.comoOtimizar} />
      <ListaSecao titulo="Erros comuns" itens={janela.errosComuns} />

      {janela.verTambem && janela.verTambem.length > 0 && (
        <Secao titulo="Ver também">
          <div className="flex flex-wrap gap-2">
            {janela.verTambem
              .filter((id) => nomesJanela.has(id))
              .map((id) => (
                <Link
                  key={id}
                  href={`/janelas/${id}`}
                  className="min-h-touch rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-accent"
                >
                  {nomesJanela.get(id)}
                </Link>
              ))}
          </div>
        </Secao>
      )}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-muted">{titulo}</h2>
      <div className="mt-1">{children}</div>
    </section>
  )
}

function ListaSecao({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null
  return (
    <Secao titulo={titulo}>
      <ul className="list-disc space-y-1 pl-5 text-base text-fg">
        {itens.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </Secao>
  )
}

/** Busca o binário autenticado (ver useImagemUrl) e converte em blob URL local. */
function ImagemJanela({ arquivo, legenda }: { arquivo: string; legenda: string }) {
  const estado = useImagemUrl(arquivo)

  if (estado.status !== 'pronto') {
    return (
      <div className="flex h-32 w-48 shrink-0 items-center justify-center rounded-lg border border-border bg-border/20 text-xs text-muted">
        {estado.status === 'erro' ? 'Erro ao carregar imagem' : 'Carregando…'}
      </div>
    )
  }
  return (
    <figure className="w-48 shrink-0">
      <img src={estado.dados} alt={legenda} className="h-32 w-48 rounded-lg border border-border object-cover" />
      <figcaption className="mt-1 text-xs text-muted">{legenda}</figcaption>
    </figure>
  )
}
