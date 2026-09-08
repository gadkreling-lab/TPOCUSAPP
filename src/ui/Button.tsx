import { forwardRef, type ButtonHTMLAttributes } from 'react'

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
  /** Ocupa toda a largura disponível — comum em telas de uma mão só. */
  bloco?: boolean
}

const CLASSES_VARIANTE: Record<VarianteBotao, string> = {
  primario: 'bg-accent text-accent-fg hover:opacity-90 active:opacity-80',
  secundario: 'bg-surface text-fg border border-border hover:bg-border/40',
  fantasma: 'bg-transparent text-fg hover:bg-border/30',
  perigo: 'bg-alterado text-white hover:opacity-90',
}

// Alvo de toque ≥44px é requisito de produto (uso com luva, uma mão só) — min-h-touch
// garante isso independente do padding escolhido pelo variante/tamanho.
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = 'primario', bloco = false, className = '', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={[
        'min-h-touch inline-flex items-center justify-center gap-2 rounded-xl px-4 text-base font-medium',
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        bloco ? 'w-full' : '',
        CLASSES_VARIANTE[variante],
        className,
      ].join(' ')}
      {...props}
    />
  )
})
