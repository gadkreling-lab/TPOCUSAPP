import { describe, expect, it } from 'vitest'
import { avaliarCalculadora } from '../src/engine/calculator/avaliar'
import type { CalculatorDef } from '../src/content/calculators/types'

import debitoCardiaco from '../src/content/calculators/debito-cardiaco.json'
import epss from '../src/content/calculators/epss.json'
import mapse from '../src/content/calculators/mapse.json'
import tapse from '../src/content/calculators/tapse.json'
import vciResponsividade from '../src/content/calculators/vci-responsividade.json'
import derramePleural from '../src/content/calculators/derrame-pleural.json'

const DC = debitoCardiaco as unknown as CalculatorDef
const EPSS = epss as unknown as CalculatorDef
const MAPSE = mapse as unknown as CalculatorDef
const TAPSE = tapse as unknown as CalculatorDef
const VCI = vciResponsividade as unknown as CalculatorDef
const DERRAME = derramePleural as unknown as CalculatorDef

function resultadoPorId(saida: ReturnType<typeof avaliarCalculadora>, id: string) {
  const r = saida.resultados.find((x) => x.id === id)
  if (!r) throw new Error(`resultado "${id}" não encontrado — erros: ${JSON.stringify(saida.erros)}`)
  return r
}

describe('Débito Cardíaco', () => {
  it('bate com o exemplo prático do ebook: TSVE 2 cm, VTI 20 cm, FC 70 -> VS 62,8 mL, DC ~4,4 L/min', () => {
    const saida = avaliarCalculadora(DC, { tsveDiametro: 2, vti: 20, fc: 70 })

    const area = resultadoPorId(saida, 'areaTsve')
    expect(area.valor).toBeCloseTo(3.14, 2) // ebook usa π ≈ 3,14 na conta manual

    const vs = resultadoPorId(saida, 'volumeSistolico')
    expect(vs.valor).toBeCloseTo(62.8, 1)
    expect(vs.tipo).toBe('classificado')
    // O próprio exemplo do ebook (TSVE 2 cm, VTI 20 cm) produz VS = 62,8 mL, abaixo
    // da faixa de referência do ebook (70-140) — o exemplo ilustra a CONTA, não um
    // paciente com VS normal. O motor classifica isso corretamente como alterado.
    if (vs.tipo === 'classificado') expect(vs.severidade).toBe('alterado')

    const dc = resultadoPorId(saida, 'debitoCardiaco')
    expect(dc.valor).toBeCloseTo(4.4, 1) // ebook: "4.396 mL/min ou 4,4 L/min"
    expect(dc.tipo).toBe('classificado')
    if (dc.tipo === 'classificado') expect(dc.severidade).toBe('normal')
  })

  it('VS e DC fora da faixa do ebook saem marcados como alterado', () => {
    // TSVE bem pequeno + VTI baixo + FC baixa -> VS e DC abaixo da faixa
    const saida = avaliarCalculadora(DC, { tsveDiametro: 1, vti: 10, fc: 50 })
    const vs = resultadoPorId(saida, 'volumeSistolico')
    const dc = resultadoPorId(saida, 'debitoCardiaco')
    expect(vs.tipo).toBe('classificado')
    expect(dc.tipo).toBe('classificado')
    if (vs.tipo === 'classificado') expect(vs.severidade).toBe('alterado')
    if (dc.tipo === 'classificado') expect(dc.severidade).toBe('alterado')
  })

  it('Índice Cardíaco só aparece quando peso e altura são preenchidos, e não é classificado', () => {
    const semPesoAltura = avaliarCalculadora(DC, { tsveDiametro: 2, vti: 20, fc: 70 })
    expect(semPesoAltura.resultados.find((r) => r.id === 'indiceCardiaco')).toBeUndefined()

    const comPesoAltura = avaliarCalculadora(DC, { tsveDiametro: 2, vti: 20, fc: 70, peso: 70, altura: 170 })
    const ic = resultadoPorId(comPesoAltura, 'indiceCardiaco')
    expect(ic.tipo).toBe('nao_classificado') // sem faixas definidas — não é do ebook
    expect(ic.origem).toBe('complementar')

    const sc = resultadoPorId(comPesoAltura, 'superficieCorporal')
    // Mosteller: sqrt(altura_cm * peso_kg / 3600) = sqrt(170*70/3600)
    expect(sc.valor).toBeCloseTo(Math.sqrt((170 * 70) / 3600), 6)
  })

  it('preview de sensibilidade: ±1 mm no diâmetro do TSVE muda o DC de forma perceptível (erro nº 1 do aluno)', () => {
    const base = avaliarCalculadora(DC, { tsveDiametro: 2, vti: 20, fc: 70 })
    const maisUmMm = avaliarCalculadora(DC, { tsveDiametro: 2.1, vti: 20, fc: 70 })
    const menosUmMm = avaliarCalculadora(DC, { tsveDiametro: 1.9, vti: 20, fc: 70 })

    const dcBase = resultadoPorId(base, 'debitoCardiaco').valor
    const dcMais = resultadoPorId(maisUmMm, 'debitoCardiaco').valor
    const dcMenos = resultadoPorId(menosUmMm, 'debitoCardiaco').valor

    // diâmetro é elevado ao quadrado -> a variação não é simétrica nem desprezível
    expect(dcMais).toBeGreaterThan(dcBase)
    expect(dcMenos).toBeLessThan(dcBase)
    expect(Math.abs(dcMais - dcBase) / dcBase).toBeGreaterThan(0.08) // >8% de variação só com ±1 mm
  })
})

describe('formulário incompleto — estado normal, não é erro', () => {
  it('campos ainda não preenchidos: o resultado que depende deles some da lista, sem entrar em erros', () => {
    const saida = avaliarCalculadora(DC, {}) // nada preenchido ainda
    expect(saida.resultados).toHaveLength(0)
    expect(saida.erros).toHaveLength(0) // "campo vazio" não é um erro para mostrar na tela
  })

  it('preenchendo só o TSVE, área calcula mas VS/DC continuam ausentes (dependem de vti/fc)', () => {
    const saida = avaliarCalculadora(DC, { tsveDiametro: 2 })
    expect(saida.resultados.map((r) => r.id)).toEqual(['areaTsve'])
    expect(saida.erros).toHaveLength(0)
  })
})

describe('EPSS', () => {
  it.each([
    [3, 'normal'],
    [6.9, 'normal'],
    [13.1, 'alterado'],
    [20, 'alterado'],
  ] as const)('EPSS %s mm classifica como %s', (valor, severidade) => {
    const saida = avaliarCalculadora(EPSS, { epssMedido: valor, valvopatia: false, proteseMitral: false })
    const r = resultadoPorId(saida, 'feveEstimativa')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe(severidade)
  })

  it('7 e 13 mm exatos ficam não classificados (lacuna real do ebook, não interpolada)', () => {
    for (const valor of [7, 13]) {
      const saida = avaliarCalculadora(EPSS, { epssMedido: valor, valvopatia: false, proteseMitral: false })
      const r = resultadoPorId(saida, 'feveEstimativa')
      expect(r.tipo).toBe('nao_classificado')
    }
  })

  it('entre 7 e 13 (exclusive) classifica como disfunção moderada', () => {
    const saida = avaliarCalculadora(EPSS, { epssMedido: 10, valvopatia: false, proteseMitral: false })
    const r = resultadoPorId(saida, 'feveEstimativa')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe('limitrofe')
  })

  it('valvopatia substitui a interpretação por aviso, mas mantém o valor calculado', () => {
    const saida = avaliarCalculadora(EPSS, { epssMedido: 3, valvopatia: true, proteseMitral: false })
    const r = resultadoPorId(saida, 'feveEstimativa')
    expect(r.tipo).toBe('aviso')
    expect(r.valor).toBe(3)
    if (r.tipo === 'aviso') expect(r.texto).toMatch(/não deve ser a medida de escolha/)
  })

  it('prótese mitral tem mensagem própria, diferente da de valvopatia', () => {
    const saida = avaliarCalculadora(EPSS, { epssMedido: 3, valvopatia: false, proteseMitral: true })
    const r = resultadoPorId(saida, 'feveEstimativa')
    expect(r.tipo).toBe('aviso')
    if (r.tipo === 'aviso') expect(r.texto).toMatch(/não deve ser usado/)
  })
})

describe('MAPSE', () => {
  it.each([
    [10, 'normal'],
    [15, 'normal'],
    [8, 'limitrofe'],
    [9.9, 'limitrofe'],
    [7.9, 'alterado'],
    [3, 'alterado'],
  ] as const)('MAPSE %s mm classifica como %s', (valor, severidade) => {
    const saida = avaliarCalculadora(MAPSE, { mapseMedido: valor })
    const r = resultadoPorId(saida, 'mapseInterpretado')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe(severidade)
  })
})

describe('TAPSE', () => {
  it.each([
    [16.9, 'alterado'],
    [5, 'alterado'],
    [17, 'normal'],
    [25, 'normal'],
  ] as const)('TAPSE %s mm classifica como %s', (valor, severidade) => {
    const saida = avaliarCalculadora(TAPSE, { tapseMedido: valor })
    const r = resultadoPorId(saida, 'tapseInterpretado')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe(severidade)
  })
})

describe('VCI — ventilação espontânea (índice de colapsabilidade)', () => {
  it('VCI < 2,1 cm com colapso > 50% -> volemia adequada/hipovolemia', () => {
    // max 1.5, min 0.5 -> colapso = (1.5-0.5)/1.5*100 = 66,7%
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'espontanea', vciMaximo: 1.5, vciMinimo: 0.5 })
    const r = resultadoPorId(saida, 'indiceColapsabilidade')
    expect(r.valor).toBeCloseTo(66.67, 1)
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.texto).toMatch(/hipovolemia/)
  })

  it('VCI > 2,1 cm com colapso < 50% -> hipervolemia/PVC elevada', () => {
    // max 2.5, min 2.0 -> colapso = (2.5-2)/2.5*100 = 20%
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'espontanea', vciMaximo: 2.5, vciMinimo: 2.0 })
    const r = resultadoPorId(saida, 'indiceColapsabilidade')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.texto).toMatch(/hipervolemia/)
  })

  it('combinação que o ebook não descreve (VCI pequena, colapso pequeno) fica não classificada', () => {
    // max 1.5, min 1.3 -> colapso = (1.5-1.3)/1.5*100 = 13,3% (< 2,1cm mas colapso < 50%)
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'espontanea', vciMaximo: 1.5, vciMinimo: 1.3 })
    const r = resultadoPorId(saida, 'indiceColapsabilidade')
    expect(r.tipo).toBe('nao_classificado')
  })

  it('não calcula o índice de distensibilidade (mecânica) quando o modo é espontânea', () => {
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'espontanea', vciMaximo: 1.5, vciMinimo: 0.5 })
    expect(saida.resultados.find((r) => r.id === 'indiceDistensibilidade')).toBeUndefined()
  })
})

describe('VCI — ventilação mecânica (índice de distensibilidade)', () => {
  const gateOk = {
    gateVentilacaoControlada: true,
    gateVolumeCorrente: true,
    gateSemEsforco: true,
    gateRitmoRegular: true,
  }

  it('índice > 18% com gate completo -> responsividade, sem aviso', () => {
    // max 2.0, min 1.5 -> distensibilidade = (2-1.5)/1.5*100 = 33,3%
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'mecanica', vciMaximo: 2.0, vciMinimo: 1.5, ...gateOk })
    const r = resultadoPorId(saida, 'indiceDistensibilidade')
    expect(r.valor).toBeCloseTo(33.33, 1)
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe('normal')
  })

  it('índice < 18% -> baixa responsividade', () => {
    // max 1.6, min 1.5 -> distensibilidade = (1.6-1.5)/1.5*100 = 6,67%
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'mecanica', vciMaximo: 1.6, vciMinimo: 1.5, ...gateOk })
    const r = resultadoPorId(saida, 'indiceDistensibilidade')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe('limitrofe')
  })

  it('exatamente 18% fica não classificado', () => {
    // max 1.18, min 1.0 -> distensibilidade = 18%
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'mecanica', vciMaximo: 1.18, vciMinimo: 1.0, ...gateOk })
    const r = resultadoPorId(saida, 'indiceDistensibilidade')
    expect(r.tipo).toBe('nao_classificado')
  })

  it('QUALQUER pré-requisito desmarcado substitui a interpretação por aviso, mas mantém o número', () => {
    const casosComUmFalso = [
      { ...gateOk, gateVentilacaoControlada: false },
      { ...gateOk, gateVolumeCorrente: false },
      { ...gateOk, gateSemEsforco: false },
      { ...gateOk, gateRitmoRegular: false },
    ]
    for (const gate of casosComUmFalso) {
      const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'mecanica', vciMaximo: 2.0, vciMinimo: 1.5, ...gate })
      const r = resultadoPorId(saida, 'indiceDistensibilidade')
      expect(r.tipo).toBe('aviso')
      expect(r.valor).toBeCloseTo(33.33, 1) // o número continua sendo calculado
    }
  })

  it('todos os pré-requisitos desmarcados (padrão) também dispara o aviso', () => {
    const saida = avaliarCalculadora(VCI, { modoVentilatorio: 'mecanica', vciMaximo: 2.0, vciMinimo: 1.5 })
    const r = resultadoPorId(saida, 'indiceDistensibilidade')
    expect(r.tipo).toBe('aviso')
  })
})

describe('Derrame pleural', () => {
  it('fórmula de Balik: distância (mm) x 20', () => {
    const saida = avaliarCalculadora(DERRAME, { distanciaBalik: 25, espacosBrockelsby: 1 })
    const r = resultadoPorId(saida, 'volumeBalik')
    expect(r.valor).toBe(500)
    expect(r.tipo).toBe('nao_classificado') // Balik não tem faixa de gravidade própria
  })

  it.each([
    [1, 'normal'],
    [2, 'limitrofe'],
    [4, 'alterado'],
    [10, 'alterado'],
  ] as const)('Brockelsby %s EIC classifica como %s', (eic, severidade) => {
    const saida = avaliarCalculadora(DERRAME, { distanciaBalik: 10, espacosBrockelsby: eic })
    const r = resultadoPorId(saida, 'classificacaoBrockelsby')
    expect(r.tipo).toBe('classificado')
    if (r.tipo === 'classificado') expect(r.severidade).toBe(severidade)
  })

  it('exatamente 3 EIC fica não classificado — lacuna citada explicitamente em CLAUDE.md, não interpolar', () => {
    const saida = avaliarCalculadora(DERRAME, { distanciaBalik: 10, espacosBrockelsby: 3 })
    const r = resultadoPorId(saida, 'classificacaoBrockelsby')
    expect(r.tipo).toBe('nao_classificado')
  })
})
