import { useId, useState, type ReactNode } from 'react'

export interface AbaDef {
  id: string
  rotulo: string
  conteudo: ReactNode
}

interface Props {
  abas: AbaDef[]
  /** id da aba inicial — default é a primeira. */
  inicial?: string
}

/**
 * Abas simples e acessíveis (padrão APG tablist) — usadas em toda calculadora para
 * "Como medir" / "Armadilhas" (ver spec do produto) e em qualquer outro conteúdo que
 * precise separar leitura em blocos sem sair da tela.
 */
export function Tabs({ abas, inicial }: Props) {
  const [ativaId, setAtivaId] = useState(inicial ?? abas[0]?.id)
  const nomeGrupo = useId()
  const ativa = abas.find((a) => a.id === ativaId) ?? abas[0]

  return (
    <div>
      <div role="tablist" aria-label="Seções" className="flex gap-1 border-b border-border">
        {abas.map((aba) => {
          const selecionada = aba.id === ativa?.id
          return (
            <button
              key={aba.id}
              role="tab"
              id={`${nomeGrupo}-tab-${aba.id}`}
              aria-selected={selecionada}
              aria-controls={`${nomeGrupo}-painel-${aba.id}`}
              onClick={() => setAtivaId(aba.id)}
              className={[
                'min-h-touch border-b-2 px-4 text-base font-medium transition-colors',
                selecionada ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg',
              ].join(' ')}
            >
              {aba.rotulo}
            </button>
          )
        })}
      </div>
      {abas.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={`${nomeGrupo}-painel-${aba.id}`}
          aria-labelledby={`${nomeGrupo}-tab-${aba.id}`}
          hidden={aba.id !== ativa?.id}
          className="py-4"
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  )
}
