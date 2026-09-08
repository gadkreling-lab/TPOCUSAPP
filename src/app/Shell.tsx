import { Link, Route, Switch, useLocation } from 'wouter'
import { AtlasScreen } from '../modules/atlas/AtlasScreen'
import { CalculatorsScreen } from '../modules/calculators/CalculatorsScreen'
import { CalculatorScreen } from '../modules/calculators/CalculatorScreen'
import { ProtocolsScreen } from '../modules/protocols/ProtocolsScreen'
import { ProtocolFlowScreen } from '../modules/protocols/ProtocolFlowScreen'
import { SessionScreen } from '../modules/session/SessionScreen'
import { ThemeToggle } from '../ui/ThemeToggle'

interface ItemNav {
  href: string
  rotulo: string
  icone: string
}

const ITENS: ItemNav[] = [
  { href: '/', rotulo: 'Atlas', icone: '🗂️' },
  { href: '/calculadoras', rotulo: 'Calculadoras', icone: '🧮' },
  { href: '/protocolos', rotulo: 'Protocolos', icone: '🩺' },
  { href: '/sessao', rotulo: 'Sessão', icone: '📋' },
]

/**
 * Navegação primária do app: tab bar fixa com os 4 módulos, decidida em
 * ARQUITETURA.md §8/PERGUNTAS.md item 8. Fica embaixo — alcance de polegar em uso de
 * uma mão só.
 */
export function Shell() {
  const [localizacaoAtual] = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-lg font-semibold text-fg">TPOCUS</span>
        <ThemeToggle />
      </header>

      <main className="flex-1 pb-touch">
        <Switch>
          <Route path="/" component={AtlasScreen} />
          <Route path="/calculadoras" component={CalculatorsScreen} />
          <Route path="/calculadoras/:id" component={CalculatorScreen} />
          <Route path="/protocolos" component={ProtocolsScreen} />
          <Route path="/protocolos/:id" component={ProtocolFlowScreen} />
          <Route path="/sessao" component={SessionScreen} />
          <Route>
            <div className="p-4 text-base text-muted">Página não encontrada.</div>
          </Route>
        </Switch>
      </main>

      <nav
        aria-label="Navegação principal"
        className="sticky bottom-0 flex border-t border-border bg-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {ITENS.map((item) => {
          const ativo = item.href === '/' ? localizacaoAtual === '/' : localizacaoAtual.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                ativo ? 'text-accent' : 'text-muted',
              ].join(' ')}
              aria-current={ativo ? 'page' : undefined}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icone}
              </span>
              {item.rotulo}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
