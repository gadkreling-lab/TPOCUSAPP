import { describe, expect, it } from 'vitest'
import { iniciar, avancar, voltar, reiniciar, progresso, noAtualObjeto, estaConcluido } from '../src/engine/protocol'
import type { ProtocolFlow } from '../src/content/protocol-flows/types'
import efastFlowJson from '../src/content/protocol-flows/efast.json'
import rushFlowJson from '../src/content/protocol-flows/rush.json'
import blueFlowJson from '../src/content/protocol-flows/blue.json'
import casaFlowJson from '../src/content/protocol-flows/casa.json'

const efastFlow = efastFlowJson as unknown as ProtocolFlow
const rushFlow = rushFlowJson as unknown as ProtocolFlow
const blueFlow = blueFlowJson as unknown as ProtocolFlow
const casaFlow = casaFlowJson as unknown as ProtocolFlow

// Flow sintético pequeno, só para testar o motor isolado do conteúdo real.
const flowSintetico: ProtocolFlow = {
  id: 'flow-teste',
  noInicial: 'p1',
  nos: {
    p1: {
      tipo: 'pergunta',
      janela: null,
      pergunta: 'Achado presente?',
      opcoes: [
        { label: 'Sim', proximo: 'p2' },
        { label: 'Não', proximo: 'c-negativo' },
      ],
      indeterminadoProximo: 'c-negativo',
    },
    p2: {
      tipo: 'pergunta',
      janela: null,
      pergunta: 'Segundo achado presente?',
      opcoes: [
        { label: 'Sim', proximo: 'c-positivo' },
        { label: 'Não', proximo: 'c-negativo' },
      ],
      indeterminadoProximo: 'c-negativo',
    },
    'c-positivo': {
      tipo: 'conclusao',
      diagnostico: 'Positivo',
      confianca: 'alta',
      justificativa: 'j',
      proximosPassos: [],
      cuidado: 'c',
    },
    'c-negativo': {
      tipo: 'conclusao',
      diagnostico: 'Negativo',
      confianca: 'alta',
      justificativa: 'j',
      proximosPassos: [],
      cuidado: 'c',
    },
  },
}

describe('motor de protocolo — máquina de estados genérica', () => {
  it('iniciar começa no noInicial com trilha vazia', () => {
    const state = iniciar('flow-teste', flowSintetico.noInicial)
    expect(state.noAtual).toBe('p1')
    expect(state.trilha).toEqual([])
  })

  it('avancar empilha o passo e move noAtual para o destino', () => {
    let state = iniciar('flow-teste', flowSintetico.noInicial)
    state = avancar(state, { label: 'Sim', proximo: 'p2' })
    expect(state.noAtual).toBe('p2')
    expect(state.trilha).toHaveLength(1)
    expect(state.trilha[0]).toMatchObject({ noId: 'p1', escolhaLabel: 'Sim', escolhaProximo: 'p2' })
  })

  it('voltar desempilha e retorna ao noId gravado, sem recalcular o grafo', () => {
    let state = iniciar('flow-teste', flowSintetico.noInicial)
    state = avancar(state, { label: 'Sim', proximo: 'p2' })
    state = avancar(state, { label: 'Sim', proximo: 'c-positivo' })
    expect(state.noAtual).toBe('c-positivo')

    state = voltar(state)
    expect(state.noAtual).toBe('p2')
    expect(state.trilha).toHaveLength(1)

    state = voltar(state)
    expect(state.noAtual).toBe('p1')
    expect(state.trilha).toHaveLength(0)
  })

  it('voltar na trilha vazia não faz nada (sem efeito colateral)', () => {
    const state = iniciar('flow-teste', flowSintetico.noInicial)
    const depois = voltar(state)
    expect(depois).toEqual(state)
  })

  it('reiniciar zera a trilha e volta ao noInicial', () => {
    let state = iniciar('flow-teste', flowSintetico.noInicial)
    state = avancar(state, { label: 'Sim', proximo: 'p2' })
    state = reiniciar('flow-teste', flowSintetico.noInicial)
    expect(state.noAtual).toBe('p1')
    expect(state.trilha).toEqual([])
  })

  it('noAtualObjeto e estaConcluido refletem o nó corrente', () => {
    let state = iniciar('flow-teste', flowSintetico.noInicial)
    expect(noAtualObjeto(state, flowSintetico)?.tipo).toBe('pergunta')
    expect(estaConcluido(state, flowSintetico)).toBe(false)

    state = avancar(state, { label: 'Não', proximo: 'c-negativo' })
    expect(estaConcluido(state, flowSintetico)).toBe(true)
    const no = noAtualObjeto(state, flowSintetico)
    expect(no?.tipo).toBe('conclusao')
    if (no?.tipo === 'conclusao') expect(no.diagnostico).toBe('Negativo')
  })

  it('progresso cresce conforme a trilha avança e satura em 1 no máximo', () => {
    let state = iniciar('flow-teste', flowSintetico.noInicial)
    const p0 = progresso(state, flowSintetico)
    state = avancar(state, { label: 'Sim', proximo: 'p2' })
    const p1 = progresso(state, flowSintetico)
    expect(p1).toBeGreaterThan(p0)
    state = avancar(state, { label: 'Sim', proximo: 'c-positivo' })
    const p2 = progresso(state, flowSintetico)
    expect(p2).toBeLessThanOrEqual(1)
    expect(p2).toBeGreaterThanOrEqual(p1)
  })

  it('progresso não estoura acima de 1 mesmo num ramo bem mais longo que a média', () => {
    // flow onde um ramo é bem mais curto que o outro — a saturação em 1 evita uma
    // barra de progresso "voltando" ou passando de 100% num ramo longo.
    const flowAssimetrico: ProtocolFlow = {
      id: 'flow-assimetrico',
      noInicial: 'a1',
      nos: {
        a1: {
          tipo: 'pergunta',
          janela: null,
          pergunta: 'q',
          opcoes: [
            { label: 'curto', proximo: 'c1' },
            { label: 'longo', proximo: 'a2' },
          ],
          indeterminadoProximo: 'c1',
        },
        a2: {
          tipo: 'pergunta',
          janela: null,
          pergunta: 'q2',
          opcoes: [{ label: 'segue', proximo: 'a3' }],
          indeterminadoProximo: 'a3',
        },
        a3: {
          tipo: 'pergunta',
          janela: null,
          pergunta: 'q3',
          opcoes: [{ label: 'segue', proximo: 'c2' }],
          indeterminadoProximo: 'c2',
        },
        c1: { tipo: 'conclusao', diagnostico: 'c1', confianca: 'alta', justificativa: 'j', proximosPassos: [], cuidado: 'c' },
        c2: { tipo: 'conclusao', diagnostico: 'c2', confianca: 'alta', justificativa: 'j', proximosPassos: [], cuidado: 'c' },
      },
    }
    let state = iniciar('flow-assimetrico', flowAssimetrico.noInicial)
    state = avancar(state, { label: 'longo', proximo: 'a2' })
    state = avancar(state, { label: 'segue', proximo: 'a3' })
    state = avancar(state, { label: 'segue', proximo: 'c2' })
    expect(progresso(state, flowAssimetrico)).toBe(1)
  })
})

/** Percorre TODOS os ramos de um flow real e devolve os ids de conclusão alcançados. */
function conclusoesAlcancaveis(flow: ProtocolFlow): Set<string> {
  const alcancadas = new Set<string>()
  function visitar(noId: string, visitadosNoCaminho: Set<string>) {
    if (visitadosNoCaminho.has(noId)) return
    const no = flow.nos[noId]
    expect(no, `nó "${noId}" referenciado mas ausente em "nos"`).toBeDefined()
    if (!no) return
    if (no.tipo === 'conclusao') {
      alcancadas.add(noId)
      return
    }
    const caminho = new Set(visitadosNoCaminho)
    caminho.add(noId)
    for (const opcao of no.opcoes) visitar(opcao.proximo, caminho)
    visitar(no.indeterminadoProximo, caminho)
  }
  visitar(flow.noInicial, new Set())
  return alcancadas
}

describe('protocol-flows reais — E-FAST', () => {
  it('todo nó de pergunta tem opções e indeterminadoProximo apontando para nós existentes', () => {
    for (const [id, no] of Object.entries(efastFlow.nos)) {
      if (no.tipo !== 'pergunta') continue
      expect(efastFlow.nos[no.indeterminadoProximo], `${id}.indeterminadoProximo`).toBeDefined()
      for (const opcao of no.opcoes) {
        expect(efastFlow.nos[opcao.proximo], `${id} -> "${opcao.label}"`).toBeDefined()
      }
    }
  })

  it('percorrer as 8 janelas respondendo "Não" leva à conclusão negativa', () => {
    let state = iniciar(efastFlow.id, efastFlow.noInicial)
    for (let i = 0; i < 8; i++) {
      const no = noAtualObjeto(state, efastFlow)
      expect(no?.tipo).toBe('pergunta')
      if (no?.tipo !== 'pergunta') break
      const naoOuIndeterminado = no.opcoes.find((o) => o.label === 'Não')
      expect(naoOuIndeterminado).toBeDefined()
      state = avancar(state, naoOuIndeterminado!)
    }
    expect(estaConcluido(state, efastFlow)).toBe(true)
    expect(state.noAtual).toBe('efast-conclusao-negativo')
  })

  it('responder "Sim" na primeira janela leva à conclusão de líquido livre', () => {
    let state = iniciar(efastFlow.id, efastFlow.noInicial)
    const no = noAtualObjeto(state, efastFlow)
    if (no?.tipo === 'pergunta') {
      state = avancar(state, no.opcoes.find((o) => o.label === 'Sim')!)
    }
    expect(state.noAtual).toBe('efast-conclusao-liquido-livre')
  })

  it('todos os achados positivos previstos são alcançáveis a partir do noInicial', () => {
    const alcancadas = conclusoesAlcancaveis(efastFlow)
    expect(alcancadas).toEqual(
      new Set([
        'efast-conclusao-liquido-livre',
        'efast-conclusao-tamponamento',
        'efast-conclusao-hemotorax-direito',
        'efast-conclusao-hemotorax-esquerdo',
        'efast-conclusao-pneumotorax-direito',
        'efast-conclusao-pneumotorax-esquerdo',
        'efast-conclusao-negativo',
      ]),
    )
  })
})

describe('protocol-flows reais — RUSH', () => {
  it('todo nó de pergunta tem opções e indeterminadoProximo apontando para nós existentes', () => {
    for (const [id, no] of Object.entries(rushFlow.nos)) {
      if (no.tipo !== 'pergunta') continue
      expect(rushFlow.nos[no.indeterminadoProximo], `${id}.indeterminadoProximo`).toBeDefined()
      for (const opcao of no.opcoes) {
        expect(rushFlow.nos[opcao.proximo], `${id} -> "${opcao.label}"`).toBeDefined()
      }
    }
  })

  it('todos os "Não" (Pump, Tank, Pipes negativos) levam ao choque distributivo por exclusão', () => {
    let state = iniciar(rushFlow.id, rushFlow.noInicial)
    // segue sempre a opção "Não" (ou a única opção "Colapsada"/"Variável" não se aplica aqui —
    // usa sempre a última opção de cada nó, que nos dois flows corresponde ao "segue adiante"
    // sem achado positivo) até uma conclusão.
    for (let passos = 0; passos < 20; passos++) {
      const no = noAtualObjeto(state, rushFlow)
      if (no?.tipo !== 'pergunta') break
      const opcaoNegativa = no.opcoes.find((o) => o.label === 'Não') ?? no.opcoes[no.opcoes.length - 1]
      state = avancar(state, opcaoNegativa)
    }
    expect(estaConcluido(state, rushFlow)).toBe(true)
    expect(state.noAtual).toBe('rush-conclusao-distributivo')
  })

  it('hipocontratilidade + contexto séptico leva ao choque misto (diagnostico como lista)', () => {
    let state = iniciar(rushFlow.id, rushFlow.noInicial)
    let no = noAtualObjeto(state, rushFlow)
    expect(no?.tipo).toBe('pergunta')
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Sim')!)

    no = noAtualObjeto(state, rushFlow)
    expect(no?.tipo).toBe('pergunta')
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Sim')!)

    expect(state.noAtual).toBe('rush-conclusao-misto')
    const conclusao = noAtualObjeto(state, rushFlow)
    expect(conclusao?.tipo).toBe('conclusao')
    if (conclusao?.tipo === 'conclusao') {
      expect(Array.isArray(conclusao.diagnostico)).toBe(true)
      expect(conclusao.diagnostico).toEqual(['Cardiogênico', 'Distributivo (séptico)'])
    }
  })

  it('hipocontratilidade isolada (sem contexto séptico) leva à conclusão cardiogênico simples', () => {
    let state = iniciar(rushFlow.id, rushFlow.noInicial)
    let no = noAtualObjeto(state, rushFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Sim')!)
    no = noAtualObjeto(state, rushFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Não')!)

    expect(state.noAtual).toBe('rush-conclusao-cardiogenico')
    const conclusao = noAtualObjeto(state, rushFlow)
    if (conclusao?.tipo === 'conclusao') expect(conclusao.diagnostico).toBe('Cardiogênico')
  })

  it('VCI colapsada leva à conclusão hipovolêmico', () => {
    let state = iniciar(rushFlow.id, rushFlow.noInicial)
    // 3 perguntas do Pump, todas "Não"
    for (let i = 0; i < 3; i++) {
      const no = noAtualObjeto(state, rushFlow)
      if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Não')!)
    }
    expect(state.noAtual).toBe('rush-tank-vci')
    const no = noAtualObjeto(state, rushFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Colapsada')!)
    expect(state.noAtual).toBe('rush-conclusao-hipovolemico')
  })
})

describe('protocol-flows reais — BLUE (Fase 4)', () => {
  it('todo nó de pergunta tem opções e indeterminadoProximo apontando para nós existentes', () => {
    for (const [id, no] of Object.entries(blueFlow.nos)) {
      if (no.tipo !== 'pergunta') continue
      expect(blueFlow.nos[no.indeterminadoProximo], `${id}.indeterminadoProximo`).toBeDefined()
      for (const opcao of no.opcoes) {
        expect(blueFlow.nos[opcao.proximo], `${id} -> "${opcao.label}"`).toBeDefined()
      }
    }
  })

  it('todos os desfechos do fluxograma da Figura 16 são alcançáveis a partir do noInicial', () => {
    const alcancadas = conclusoesAlcancaveis(blueFlow)
    expect(alcancadas).toEqual(
      new Set([
        'blue-conclusao-edema', // PRESENTE, Perfil B
        'blue-conclusao-tep', // PRESENTE, Perfil A, Trombose Venosa
        'blue-conclusao-pneumonia-plaps', // PRESENTE, Perfil A, Veias Livres, PLAPS
        'blue-conclusao-dpoc-asma', // PRESENTE, Perfil A, Veias Livres, SEM PLAPS
        'blue-conclusao-diminuido', // DIMINUÍDO
        'blue-conclusao-pneumonia-abolido', // ABOLIDO, Perfil B
        'blue-conclusao-pneumotorax', // ABOLIDO, Linhas A, Lung Point Sim
        'blue-conclusao-aprofundar', // ABOLIDO, Linhas A, Lung Point Não
        'blue-conclusao-indeterminado',
      ]),
    )
  })

  it('PRESENTE → Perfil A → Trombose Venosa → TEP (ramo mais profundo do fluxograma)', () => {
    let state = iniciar(blueFlow.id, blueFlow.noInicial)
    let no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Presente')!)
    no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Perfil A')!)
    no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Trombose Venosa')!)
    expect(state.noAtual).toBe('blue-conclusao-tep')
  })

  it('ABOLIDO → Linhas A → Lung Point ausente → "Aprofundar o diagnóstico com outros métodos" (lacuna do próprio fluxograma, não interpolada)', () => {
    let state = iniciar(blueFlow.id, blueFlow.noInicial)
    let no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Abolido')!)
    no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Linhas A')!)
    no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Não')!)
    expect(state.noAtual).toBe('blue-conclusao-aprofundar')
    const conclusao = noAtualObjeto(state, blueFlow)
    if (conclusao?.tipo === 'conclusao') expect(conclusao.confianca).toBe('baixa')
  })

  it('DIMINUÍDO leva direto à conclusão (é um ramo terminal único no fluxograma, sem sub-pergunta)', () => {
    let state = iniciar(blueFlow.id, blueFlow.noInicial)
    const no = noAtualObjeto(state, blueFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Diminuído')!)
    expect(state.noAtual).toBe('blue-conclusao-diminuido')
    expect(estaConcluido(state, blueFlow)).toBe(true)
  })
})

describe('protocol-flows reais — CASA (Fase 4, validado em 2026-09-09)', () => {
  it('todo nó de pergunta tem opções e indeterminadoProximo apontando para nós existentes', () => {
    for (const [id, no] of Object.entries(casaFlow.nos)) {
      if (no.tipo !== 'pergunta') continue
      expect(casaFlow.nos[no.indeterminadoProximo], `${id}.indeterminadoProximo`).toBeDefined()
      for (const opcao of no.opcoes) {
        expect(casaFlow.nos[opcao.proximo], `${id} -> "${opcao.label}"`).toBeDefined()
      }
    }
  })

  it('as 3 etapas cronometradas são sequenciais: tamponamento → embolia → atividade', () => {
    expect(casaFlow.noInicial).toBe('casa-01-tamponamento')
    const etapa1 = casaFlow.nos['casa-01-tamponamento']
    const etapa2 = casaFlow.nos['casa-02-embolia']
    expect(etapa1.tipo).toBe('pergunta')
    expect(etapa2.tipo).toBe('pergunta')
    if (etapa1.tipo === 'pergunta') {
      expect(etapa1.opcoes.find((o) => o.label.startsWith('Não'))?.proximo).toBe('casa-02-embolia')
    }
    if (etapa2.tipo === 'pergunta') {
      expect(etapa2.opcoes.find((o) => o.label === 'Não')?.proximo).toBe('casa-03-atividade')
    }
  })

  it('tamponamento presente na etapa 1 conclui sem passar pelas etapas 2 e 3', () => {
    let state = iniciar(casaFlow.id, casaFlow.noInicial)
    const no = noAtualObjeto(state, casaFlow)
    if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label.startsWith('Sim'))!)
    expect(state.noAtual).toBe('casa-conclusao-tamponamento')
  })

  it('as 3 etapas negativas levam à checagem de atividade cardíaca, e "standstill" tem confiança baixa', () => {
    let state = iniciar(casaFlow.id, casaFlow.noInicial)
    for (let i = 0; i < 2; i++) {
      const no = noAtualObjeto(state, casaFlow)
      if (no?.tipo === 'pergunta') state = avancar(state, no.opcoes.find((o) => o.label === 'Não')!)
    }
    expect(state.noAtual).toBe('casa-03-atividade')
    const no = noAtualObjeto(state, casaFlow)
    if (no?.tipo === 'pergunta') {
      state = avancar(state, no.opcoes.find((o) => o.label.startsWith('Não'))!)
    }
    expect(state.noAtual).toBe('casa-conclusao-atividade-ausente')
    const conclusao = noAtualObjeto(state, casaFlow)
    if (conclusao?.tipo === 'conclusao') {
      expect(conclusao.confianca).toBe('baixa')
      // Requisito de segurança clínica: a ressuscitação nunca deve ser suspensa com base
      // isolada neste achado — o texto precisa reforçar isso mesmo no branch mais grave.
      expect(conclusao.cuidado).toMatch(/ressuscitação inicial deve ser tentada em todos os pacientes/)
    }
  })

  it('todas as conclusões alcançáveis do CASA são as esperadas', () => {
    const alcancadas = conclusoesAlcancaveis(casaFlow)
    expect(alcancadas).toEqual(
      new Set([
        'casa-conclusao-tamponamento',
        'casa-conclusao-embolia',
        'casa-conclusao-atividade-presente',
        'casa-conclusao-atividade-ausente',
        'casa-conclusao-indeterminado',
      ]),
    )
  })
})
