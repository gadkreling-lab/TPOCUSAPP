import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'wouter'
import type { CalculatorDef, FieldDef } from '../../content/calculators/types'
import { useCalculators } from '../../queries/hooks'
import { avaliarCalculadora, type ResultadoCalculado } from '../../engine/calculator'
import { Tabs } from '../../ui/Tabs'
import { CampoInput, type ValoresFormulario } from './CampoInput'
import { ResultCard } from './ResultCard'
import { SensibilidadePreview } from './SensibilidadePreview'

export function CalculatorScreen() {
  const params = useParams<{ id: string }>()
  const estado = useCalculators()

  if (estado.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando…</p>
      </div>
    )
  }
  if (estado.status === 'erro') {
    return (
      <div className="p-4">
        <p role="alert" className="text-base text-alterado">
          {estado.erro.message}
        </p>
      </div>
    )
  }

  const def = estado.dados.find((c) => c.id === params.id)
  if (!def) {
    return (
      <div className="p-4">
        <p className="text-base text-alterado">Calculadora não encontrada.</p>
        <Link href="/calculadoras" className="text-accent underline">
          Voltar
        </Link>
      </div>
    )
  }

  // key=def.id garante que, se o aluno navegar de uma calculadora para outra sem
  // desmontar a rota (ex.: link direto de uma para outra), o estado do formulário
  // reseta — cada calculadora começa com CalculatorForm's lazy initializer de novo.
  return <CalculatorForm key={def.id} def={def} />
}

function valoresIniciais(campos: FieldDef[]): ValoresFormulario {
  const v: ValoresFormulario = {}
  for (const c of campos) if (c.padrao !== undefined) v[c.id] = c.padrao
  return v
}

function CalculatorForm({ def }: { def: CalculatorDef }) {
  // Lazy initializer: só roda uma vez, na primeira montagem — `def` já está garantido
  // (CalculatorScreen só monta este componente depois de resolver a calculadora).
  const [valores, setValores] = useState<ValoresFormulario>(() => valoresIniciais(def.campos))
  const saida = useMemo(() => avaliarCalculadora(def, valores), [def, valores])

  function onChange(id: string, valor: number | boolean | string | undefined) {
    setValores((v) => ({ ...v, [id]: valor }))
  }

  function onAdicionarASessao(_r: ResultadoCalculado) {
    // Módulo 4 (Sessão de exame) é a Fase 6 — por ora só confirma visualmente.
    window.alert('A sessão de exame chega na Fase 6. Por enquanto, este resultado não é salvo.')
  }

  const camposAjudaRapida = def.campos.filter((c) => c.ajudaRapidaImpacto)

  const abas: { id: string; rotulo: string; conteudo: ReactNode }[] = [
    { id: 'como-medir', rotulo: 'Como medir', conteudo: <ListaTexto itens={def.comoMedir} /> },
    {
      id: 'armadilhas',
      rotulo: 'Armadilhas',
      conteudo: <ListaTexto itens={def.armadilhas} vazio="Nenhuma armadilha listada para esta medida." />,
    },
  ]
  if (def.dicas?.length) {
    abas.push({ id: 'dicas', rotulo: 'Dicas', conteudo: <ListaTexto itens={def.dicas} /> })
  }

  // Agrupa campos por `grupo` (ex.: os 4 itens do gate da VCI mecânica) mantendo a
  // ordem de declaração; campos sem grupo ficam soltos, na ordem em que aparecem.
  const grupos = useMemo(() => {
    const ordem: (string | null)[] = []
    const porGrupo = new Map<string | null, FieldDef[]>()
    for (const c of def.campos) {
      const chave = c.grupo ?? null
      if (!porGrupo.has(chave)) {
        porGrupo.set(chave, [])
        ordem.push(chave)
      }
      porGrupo.get(chave)!.push(c)
    }
    return ordem.map((chave) => ({ titulo: chave, campos: porGrupo.get(chave)! }))
  }, [def])

  return (
    <div className="space-y-4 p-4">
      <div>
        <Link href="/calculadoras" className="text-sm text-accent underline">
          ‹ Calculadoras
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-fg">{def.nome}</h1>
      </div>

      <div className="space-y-4">
        {grupos.map(({ titulo, campos }, i) => (
          <div key={titulo ?? `_${i}`} className="space-y-3">
            {titulo && <p className="text-sm font-semibold text-muted">{titulo}</p>}
            {campos.map((campo) => (
              <CampoInput key={campo.id} campo={campo} valores={valores} onChange={onChange} />
            ))}
          </div>
        ))}
      </div>

      {camposAjudaRapida.map((c) => (
        <SensibilidadePreview key={c.id} def={def} campoId={c.id} valores={valores} />
      ))}

      {saida.resultados.length > 0 && (
        <div className="space-y-3">
          {saida.resultados.map((r) => (
            <ResultCard key={r.id} resultado={r} onAdicionarASessao={onAdicionarASessao} />
          ))}
        </div>
      )}

      {saida.erros.length > 0 && (
        <div className="rounded-xl border border-alterado/40 bg-alterado/10 p-3 text-sm text-alterado">
          {saida.erros.map((e) => (
            <p key={e.id}>{e.mensagem}</p>
          ))}
        </div>
      )}

      <Tabs abas={abas} />
    </div>
  )
}

function ListaTexto({ itens, vazio }: { itens: string[]; vazio?: string }) {
  if (itens.length === 0) {
    return <p className="text-base text-muted">{vazio ?? 'Sem itens.'}</p>
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-base text-fg">
      {itens.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
}
