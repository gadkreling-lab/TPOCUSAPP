import { Link } from 'wouter'
import { useCalculators } from '../../queries/hooks'
import { PageRef } from '../../ui/PageRef'

export function CalculatorsScreen() {
  const estado = useCalculators()

  if (estado.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando calculadoras…</p>
      </div>
    )
  }

  if (estado.status === 'erro') {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold text-fg">Calculadoras</h1>
        <p role="alert" className="mt-2 text-base text-alterado">
          {estado.erro.message}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-fg">Calculadoras</h1>
      <p className="mt-1 text-sm text-muted">Insira as medidas do exame e receba o valor já interpretado.</p>

      <ul className="mt-4 space-y-2">
        {estado.dados.map((calc) => (
          <li key={calc.id}>
            <Link
              href={`/calculadoras/${calc.id}`}
              className="flex min-h-touch items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 text-fg"
            >
              <div>
                <p className="text-base font-medium">{calc.nome}</p>
                <PageRef paginaEbook={calc.paginaEbook} />
              </div>
              <span aria-hidden="true" className="text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
