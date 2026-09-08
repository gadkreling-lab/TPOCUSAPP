import type { CalculatorDef } from '../../content/calculators/types'
import { avaliarCalculadora, type ValorCampo } from '../../engine/calculator'

interface Props {
  def: CalculatorDef
  campoId: string
  valores: Record<string, ValorCampo>
}

function formatar(v: number): string {
  return (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/**
 * Preview em tempo real do impacto de ±delta no campo marcado com
 * `ajudaRapidaImpacto` — requisito de UX do spec: o diâmetro do TSVE é elevado ao
 * quadrado no cálculo, e um erro de ±1 mm na medida é o erro nº 1 do aluno. Reusa o
 * mesmo motor (src/engine/calculator/), sem fórmula nova — só roda a avaliação mais
 * duas vezes com o campo deslocado.
 */
export function SensibilidadePreview({ def, campoId, valores }: Props) {
  const valorAtual = valores[campoId]
  if (typeof valorAtual !== 'number') return null

  const campo = def.campos.find((c) => c.id === campoId)
  if (!campo) return null

  // O passo (step) do próprio campo é quem define o tamanho da variação mostrada —
  // dado, não hardcode: para o TSVE em cm, step 0,1 já significa ±1 mm.
  const delta = campo.step ?? 0.1

  const saidaMais = avaliarCalculadora(def, { ...valores, [campoId]: valorAtual + delta })
  const saidaMenos = avaliarCalculadora(def, { ...valores, [campoId]: valorAtual - delta })
  const saidaBase = avaliarCalculadora(def, valores)

  // Só mostra resultados numéricos que existem nos três cenários (evita comparar
  // um resultado que só aparece condicionalmente).
  const idsComuns = saidaBase.resultados
    .map((r) => r.id)
    .filter((id) => saidaMais.resultados.some((r) => r.id === id) && saidaMenos.resultados.some((r) => r.id === id))

  if (idsComuns.length === 0) return null

  const deltaFormatado = formatar(delta * (campo.unidade === 'cm' ? 10 : 1)) + (campo.unidade === 'cm' ? ' mm' : ` ${campo.unidade ?? ''}`)

  return (
    <div className="rounded-2xl border border-limitrofe/40 bg-limitrofe/10 p-4">
      <p className="text-sm font-semibold text-fg">
        Impacto de ±{deltaFormatado} em "{campo.label}"
      </p>
      <p className="mt-1 text-sm text-muted">
        {campo.label} é elevado ao quadrado nesta calculadora — uma pequena diferença na medida muda o resultado
        mais do que parece. Confira a medida com atenção.
      </p>
      <div className="mt-3 space-y-2">
        {idsComuns.map((id) => {
          const base = saidaBase.resultados.find((r) => r.id === id)!
          const mais = saidaMais.resultados.find((r) => r.id === id)!
          const menos = saidaMenos.resultados.find((r) => r.id === id)!
          return (
            <div key={id} className="flex items-center justify-between text-sm">
              <span className="text-fg">{base.label}</span>
              <span className="text-muted">
                {formatar(menos.valor)} ← <strong className="text-fg">{formatar(base.valor)}</strong> → {formatar(mais.valor)}{' '}
                {base.unidade}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
