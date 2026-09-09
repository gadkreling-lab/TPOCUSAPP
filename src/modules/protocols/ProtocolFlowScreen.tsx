import { useEffect, useState } from 'react'
import { Link, useParams } from 'wouter'
import { useProtocolFlows, useProtocols, useWindows } from '../../queries/hooks'
import type { ProtocolFlow } from '../../content/protocol-flows/types'
import type { Protocol } from '../../content/types'
import {
  avancar,
  estaConcluido,
  iniciar,
  noAtualObjeto,
  progresso,
  reiniciar,
  voltar,
  type ProtocolState,
} from '../../engine/protocol'
import { Button } from '../../ui/Button'
import { SourceTag } from '../../ui/SourceTag'
import { adicionarEntradaNaSessaoAtiva } from '../../storage/sessaoAtiva'
import { entradaProtocolo } from '../../storage/sessao'

export function ProtocolFlowScreen() {
  const params = useParams<{ id: string }>()
  const estadoProtocolos = useProtocols()
  const estadoFlows = useProtocolFlows()
  const estadoWindows = useWindows()

  if (estadoProtocolos.status === 'carregando' || estadoFlows.status === 'carregando' || estadoWindows.status === 'carregando') {
    return (
      <div className="p-4">
        <p className="text-base text-muted">Carregando protocolo…</p>
      </div>
    )
  }

  const erro =
    estadoProtocolos.status === 'erro'
      ? estadoProtocolos.erro
      : estadoFlows.status === 'erro'
        ? estadoFlows.erro
        : estadoWindows.status === 'erro'
          ? estadoWindows.erro
          : null
  if (erro) {
    return (
      <div className="p-4">
        <p role="alert" className="text-base text-alterado">
          {erro.message}
        </p>
      </div>
    )
  }
  if (estadoProtocolos.status !== 'pronto' || estadoFlows.status !== 'pronto' || estadoWindows.status !== 'pronto') return null

  const flow = estadoFlows.dados.find((f) => f.id === params.id)
  const protocolo = estadoProtocolos.dados.find((p) => p.id === params.id)

  if (!flow) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-base text-alterado">
          {protocolo ? `${protocolo.nome} ainda não tem exame guiado interativo.` : 'Protocolo não encontrado.'}
        </p>
        <Link href="/protocolos" className="text-accent underline">
          ‹ Voltar
        </Link>
      </div>
    )
  }

  const nomesJanela = new Map(estadoWindows.dados.map((j) => [j.id, j.nome]))

  // key=flow.id: trocar de protocolo sem desmontar a rota reseta o estado do exame.
  return <ExecucaoProtocolo key={flow.id} flow={flow} protocolo={protocolo} nomesJanela={nomesJanela} />
}

const ROTULO_CONFIANCA: Record<string, string> = {
  alta: 'Confiança alta',
  media: 'Confiança média',
  baixa: 'Confiança baixa',
  indeterminado: 'Confiança indeterminada',
}

function ExecucaoProtocolo({
  flow,
  protocolo,
  nomesJanela,
}: {
  flow: ProtocolFlow
  protocolo: Protocol | undefined
  nomesJanela: Map<string, string>
}) {
  const [state, setState] = useState<ProtocolState>(() => iniciar(flow.id, flow.noInicial))
  const [mensagemSessao, setMensagemSessao] = useState<string | null>(null)

  const no = noAtualObjeto(state, flow)
  const concluido = estaConcluido(state, flow)
  const pct = Math.round(progresso(state, flow) * 100)

  function onReiniciar() {
    setState(reiniciar(flow.id, flow.noInicial))
  }

  async function onAdicionarASessao() {
    if (!no || no.tipo !== 'conclusao') return
    await adicionarEntradaNaSessaoAtiva(entradaProtocolo(flow.id, protocolo?.nome ?? flow.id, no))
    setMensagemSessao('Conclusão adicionada à sessão.')
    setTimeout(() => setMensagemSessao(null), 2500)
  }

  if (!no) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-base text-alterado">Nó "{state.noAtual}" não encontrado no protocolo.</p>
        <Button onClick={onReiniciar}>Reiniciar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/protocolos" className="text-sm text-accent underline">
            ‹ Protocolos
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-fg">{protocolo?.nome ?? flow.id}</h1>
        </div>
        {state.trilha.length > 0 && (
          <Button variante="fantasma" onClick={onReiniciar} className="shrink-0 px-3 text-sm">
            Reiniciar
          </Button>
        )}
      </div>

      {protocolo?.status === 'pendente_validacao' && (
        <div className="rounded-xl border border-limitrofe/40 bg-limitrofe/15 p-3 text-sm text-limitrofe">
          <p className="font-semibold">Conteúdo em validação clínica pelos sócios do curso — não publicado.</p>
          {protocolo.avisoClinico && <p className="mt-1">{protocolo.avisoClinico}</p>}
        </div>
      )}

      {/* CLAUDE.md Regra 2: todo protocolo com fonteExterna precisa do selo visível, sem
          exceção — o CASA inteiro vem de Gardner 2017/Clattenburg 2018, não do ebook. */}
      {protocolo?.fonteExterna && <SourceTag fonte={protocolo.fonteExterna} />}

      <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      {state.trilha.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {state.trilha.map((passo, i) => (
            <span key={i} className="rounded-md border border-border bg-surface px-2 py-0.5">
              {passo.escolhaLabel}
            </span>
          ))}
        </div>
      )}

      {no.tipo === 'pergunta' ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          {protocolo?.timerSegundos != null && (
            <TimerPausa
              segundos={protocolo.timerSegundos}
              mostrarAlerta={!!protocolo.alertaRetomarCompressoes}
              chave={state.noAtual}
            />
          )}
          {no.janela && nomesJanela.has(no.janela) && (
            <p className="text-sm text-muted">Janela: {nomesJanela.get(no.janela)}</p>
          )}
          <p className="text-base font-medium text-fg">{no.pergunta}</p>
          {no.comoFazer && <p className="text-sm text-muted">{no.comoFazer}</p>}
          {no.achadosDeApoio && no.achadosDeApoio.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {no.achadosDeApoio.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}

          <div className="space-y-2 pt-1">
            {no.opcoes.map((opcao) => (
              <Button
                key={opcao.label}
                bloco
                variante="secundario"
                onClick={() => setState((s) => avancar(s, opcao))}
              >
                {opcao.label}
              </Button>
            ))}
            <Button
              bloco
              variante="fantasma"
              className="text-muted"
              onClick={() => setState((s) => avancar(s, { label: 'Não consegui avaliar', proximo: no.indeterminadoProximo }))}
            >
              Não consegui avaliar esta janela
            </Button>
          </div>

          {state.trilha.length > 0 && (
            <Button variante="fantasma" onClick={() => setState(voltar)} className="text-sm">
              ‹ Voltar
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(no.diagnostico) ? no.diagnostico : [no.diagnostico]).map((d) => (
              <span key={d} className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-base font-semibold text-fg">
                {d}
              </span>
            ))}
          </div>
          {Array.isArray(no.diagnostico) && (
            <p className="text-sm text-muted">
              Mais de um perfil é compatível com os achados — os dois convivem, o protocolo não escolhe um.
            </p>
          )}

          <span className="inline-block rounded-md border border-border bg-border/30 px-2 py-0.5 text-xs text-muted">
            {ROTULO_CONFIANCA[no.confianca] ?? no.confianca}
          </span>

          <p className="text-base text-fg">{no.justificativa}</p>

          {no.proximosPassos.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted">Próximos passos</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-fg">
                {no.proximosPassos.map((passo, i) => (
                  <li key={i}>{passo}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-limitrofe/40 bg-limitrofe/10 p-3 text-sm text-fg">{no.cuidado}</div>

          {mensagemSessao && (
            <p role="status" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              {mensagemSessao}
            </p>
          )}

          <Button bloco variante="secundario" onClick={onAdicionarASessao}>
            + Adicionar à sessão
          </Button>

          <Button bloco onClick={onReiniciar}>
            Reiniciar protocolo
          </Button>

          {state.trilha.length > 0 && (
            <Button variante="fantasma" onClick={() => setState(voltar)} className="text-sm">
              ‹ Voltar
            </Button>
          )}
        </div>
      )}

      {concluido && (
        <p className="text-xs text-muted">
          Conclusão de apoio ao raciocínio clínico — nunca substitui a avaliação clínica completa nem decide isoladamente
          a conduta.
        </p>
      )}
    </div>
  )
}

/**
 * Cronômetro de pausa — só aparece quando o `Protocol` correspondente declara
 * `timerSegundos` (hoje só o CASA, via dado, não por id hardcoded: ARQUITETURA.md §2.3
 * — o motor lê o campo, não decide "é o CASA" no código). Reinicia a cada nó novo
 * (`chave` = id do nó atual) porque cada pergunta é uma pausa de checagem de pulso
 * independente. Ao estourar o tempo, se `alertaRetomarCompressoes` estiver marcado,
 * mostra o lembrete de retomar as compressões — nunca bloqueia a resposta.
 */
function TimerPausa({ segundos, mostrarAlerta, chave }: { segundos: number; mostrarAlerta: boolean; chave: string }) {
  const [decorrido, setDecorrido] = useState(0)

  useEffect(() => {
    setDecorrido(0)
    const id = setInterval(() => setDecorrido((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [chave])

  const estourou = decorrido >= segundos

  return (
    <div
      role="timer"
      aria-live="polite"
      className={[
        'rounded-lg border p-3 text-sm',
        estourou ? 'border-alterado/40 bg-alterado/10 text-alterado' : 'border-border bg-border/20 text-muted',
      ].join(' ')}
    >
      <p className="font-semibold">{estourou ? `Pausa ≥ ${segundos}s` : `Pausa: ${decorrido}s / ${segundos}s`}</p>
      {estourou && mostrarAlerta && <p className="mt-1">Retome as compressões agora.</p>}
    </div>
  )
}
