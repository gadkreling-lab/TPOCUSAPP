export type Severidade = 'normal' | 'limitrofe' | 'alterado'

const ESTILO: Record<Severidade, string> = {
  normal: 'bg-normal/15 text-normal border-normal/40',
  limitrofe: 'bg-limitrofe/15 text-limitrofe border-limitrofe/40',
  alterado: 'bg-alterado/15 text-alterado border-alterado/40',
}

const ROTULO_PADRAO: Record<Severidade, string> = {
  normal: 'Normal',
  limitrofe: 'Limítrofe',
  alterado: 'Alterado',
}

interface Props {
  severidade: Severidade
  /** Texto do selo. Default é o rótulo em português da severidade. */
  children?: React.ReactNode
}

// Nunca só cor: o texto do selo é sempre visível (requisito de acessibilidade do
// spec — um médico com daltonismo em plantão precisa distinguir sem depender da cor).
export function Badge({ severidade, children }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
        ESTILO[severidade],
      ].join(' ')}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {children ?? ROTULO_PADRAO[severidade]}
    </span>
  )
}
