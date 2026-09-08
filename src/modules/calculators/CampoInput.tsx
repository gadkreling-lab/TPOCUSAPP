import type { FieldDef } from '../../content/calculators/types'
import { NumberField } from '../../ui/NumberField'

export type ValoresFormulario = Record<string, number | boolean | string | undefined>

interface Props {
  campo: FieldDef
  valores: ValoresFormulario
  onChange: (id: string, valor: number | boolean | string | undefined) => void
}

/** Renderiza o controle certo para cada FieldDef.tipo — motor não decide UI, só forma. */
export function CampoInput({ campo, valores, onChange }: Props) {
  if (campo.somenteSeCampo && valores[campo.somenteSeCampo.id] !== campo.somenteSeCampo.valor) {
    return null
  }

  if (campo.tipo === 'numero') {
    const valor = valores[campo.id]
    return (
      <NumberField
        label={campo.label}
        unidade={campo.unidade}
        ajuda={campo.dicaFaixa}
        value={typeof valor === 'number' ? valor : ''}
        onChange={(v) => onChange(campo.id, v === '' ? undefined : v)}
        min={campo.min}
        max={campo.max}
        step={campo.step}
      />
    )
  }

  if (campo.tipo === 'booleano') {
    const marcado = valores[campo.id] === true
    return (
      <label className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-3">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => onChange(campo.id, e.target.checked)}
          className="h-5 w-5 shrink-0 accent-accent"
        />
        <span className="text-base text-fg">{campo.label}</span>
      </label>
    )
  }

  // 'selecao'
  return (
    <fieldset>
      <legend className="mb-1.5 text-base font-medium text-fg">{campo.label}</legend>
      <div className="flex gap-2">
        {(campo.opcoes ?? []).map((opcao) => {
          const selecionado = valores[campo.id] === opcao.valor
          return (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => onChange(campo.id, opcao.valor)}
              aria-pressed={selecionado}
              className={[
                'min-h-touch flex-1 rounded-xl border px-3 text-base font-medium transition-colors',
                selecionado ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-fg',
              ].join(' ')}
            >
              {opcao.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
