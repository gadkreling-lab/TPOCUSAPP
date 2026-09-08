import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label: string
  unidade?: string
  /** Texto de apoio abaixo do campo — ex.: faixa de referência. */
  ajuda?: string
  erro?: string
  value: number | ''
  onChange: (valor: number | '') => void
}

/**
 * Campo numérico para as calculadoras — teclado numérico grande, sem slider (o spec
 * é explícito: sliders ensinam bem, mas são ruins para digitar "2,14" com pressa em
 * plantão). Sem spinners nativos (as setinhas do <input type=number>) — atrapalham
 * mais do que ajudam em toque.
 */
export const NumberField = forwardRef<HTMLInputElement, Props>(function NumberField(
  { label, unidade, ajuda, erro, value, onChange, className = '', id, ...props },
  ref,
) {
  const idGerado = useId()
  const inputId = id ?? idGerado
  const ajudaId = ajuda ? `${inputId}-ajuda` : undefined
  const erroId = erro ? `${inputId}-erro` : undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-base font-medium text-fg">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch">
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          // MozAppearance/WebkitAppearance removem as setinhas nativas em navegadores
          // que as respeitam via classe; Firefox precisa de style inline (sem
          // suporte via utilitário Tailwind padrão).
          style={{ MozAppearance: 'textfield' }}
          value={value}
          onChange={(e) => {
            const bruto = e.target.value.replace(',', '.')
            if (bruto === '') return onChange('')
            const n = Number(bruto)
            if (!Number.isNaN(n)) onChange(n)
          }}
          aria-describedby={[ajudaId, erroId].filter(Boolean).join(' ') || undefined}
          aria-invalid={erro ? true : undefined}
          className={[
            'min-h-touch w-full rounded-xl border bg-surface px-3 text-lg text-fg',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            erro ? 'border-alterado' : 'border-border',
            unidade ? 'rounded-r-none border-r-0' : '',
          ].join(' ')}
          {...props}
        />
        {unidade && (
          <span className="flex min-h-touch items-center rounded-r-xl border border-l-0 border-border bg-border/30 px-3 text-base text-muted">
            {unidade}
          </span>
        )}
      </div>
      {ajuda && !erro && (
        <p id={ajudaId} className="mt-1 text-sm text-muted">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={erroId} className="mt-1 text-sm text-alterado">
          {erro}
        </p>
      )}
    </div>
  )
})
