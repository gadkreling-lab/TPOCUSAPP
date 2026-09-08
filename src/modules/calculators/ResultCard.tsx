import type { ResultadoCalculado } from '../../engine/calculator/avaliar'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { PageRef } from '../../ui/PageRef'

function formatarValor(v: number): string {
  // até 2 casas, sem zeros à direita desnecessários — 4.4 continua "4,4", não "4,40"
  const arredondado = Math.round(v * 100) / 100
  return arredondado.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

interface Props {
  resultado: ResultadoCalculado
  onAdicionarASessao?: (r: ResultadoCalculado) => void
}

/**
 * Um resultado de calculadora: valor, unidade, faixa de referência, interpretação e
 * selo de severidade — exatamente o que o spec pede para todo resultado. Estados de
 * `aviso` (pré-condição clínica falhou) e `nao_classificado` (lacuna do ebook) nunca
 * usam o Badge verde/amarelo/vermelho — são avisos, não uma classificação de verdade.
 */
export function ResultCard({ resultado: r, onAdicionarASessao }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{r.label}</p>
          <p className="text-xl font-semibold text-fg">
            {formatarValor(r.valor)} <span className="text-base font-normal text-muted">{r.unidade}</span>
          </p>
          {r.faixaReferencia && (
            <p className="mt-0.5 text-sm text-muted">
              Referência: {formatarValor(r.faixaReferencia.min)} – {formatarValor(r.faixaReferencia.max)} {r.unidade}
            </p>
          )}
        </div>
        {r.tipo === 'classificado' && <Badge severidade={r.severidade} />}
      </div>

      <div className="mt-3">
        {r.tipo === 'classificado' && <p className="text-base text-fg">{r.texto}</p>}
        {r.tipo === 'aviso' && (
          <p className="flex items-start gap-2 rounded-lg bg-limitrofe/10 p-2.5 text-sm text-fg">
            <span aria-hidden="true">⚠️</span>
            {r.texto}
          </p>
        )}
        {r.tipo === 'nao_classificado' && (
          <p className="flex items-start gap-2 rounded-lg bg-border/30 p-2.5 text-sm text-muted">
            <span aria-hidden="true">ℹ️</span>
            {r.texto}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-muted">
          {r.origem === 'complementar' ? (
            <span className="rounded-md border border-border bg-border/30 px-2 py-0.5 text-xs">Cálculo complementar — não é do ebook</span>
          ) : (
            <PageRef paginaEbook={r.paginaEbook} />
          )}
        </span>
        {onAdicionarASessao && (
          // Alvo de toque continua ≥44px (min-h-touch do Button) — só o texto é menor,
          // nunca a área clicável, mesmo num botão "secundário" dentro de um card.
          <Button variante="secundario" onClick={() => onAdicionarASessao(r)} className="px-3 text-sm">
            + Adicionar à sessão
          </Button>
        )}
      </div>
    </div>
  )
}
