import type { FonteExterna } from '../content/types'

interface Props {
  fonte: FonteExterna
  /** Nome do campo específico que este selo está marcando, se relevante na tela. */
  campo?: string
}

/**
 * Selo "fora do ebook" — CLAUDE.md Regra 2 é explícita: todo campo vindo de
 * `fonteExterna` precisa disso visível, sem exceção. Nunca omitir mesmo que o selo
 * "atrapalhe" o layout.
 */
export function SourceTag({ fonte }: Props) {
  const rotulo = fonte.tipo === 'autor' ? 'Autor do curso' : 'Fora do ebook'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border bg-border/30 px-2 py-0.5 text-xs text-muted"
      title={fonte.nota ?? fonte.referencia}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-current">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.75 10.5h-1.5V7h1.5v4.5Zm0-6h-1.5V4h1.5v1.5Z" />
      </svg>
      {fonte.url ? (
        <a href={fonte.url} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-fg">
          {rotulo}: {fonte.referencia}
        </a>
      ) : (
        <span>
          {rotulo}: {fonte.referencia}
        </span>
      )}
    </span>
  )
}
