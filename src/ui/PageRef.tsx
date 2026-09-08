interface Props {
  /** null = não vem do ebook (protocolo CASA, por exemplo) — não renderiza nada. */
  paginaEbook: number | null | undefined
  paginasEbook?: number[]
}

/**
 * "Ebook, pág. X" — rastreabilidade é requisito de produto (spec: todo valor de corte
 * mostra a origem). Fica ao lado de qualquer conteúdo vindo do ebook; SourceTag cobre
 * o caso complementar (conteúdo de fora do ebook).
 */
export function PageRef({ paginaEbook, paginasEbook }: Props) {
  if (paginaEbook == null) return null
  const paginas = paginasEbook && paginasEbook.length > 1 ? paginasEbook.join(', ') : String(paginaEbook)
  const plural = paginasEbook && paginasEbook.length > 1
  return <span className="text-sm text-muted">{plural ? `Ebook, págs. ${paginas}` : `Ebook, pág. ${paginas}`}</span>
}
