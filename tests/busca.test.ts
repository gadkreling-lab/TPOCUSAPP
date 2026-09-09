import { describe, expect, it } from 'vitest'
import { buscar, totalResultados } from '../src/modules/atlas/busca'
import windows from '../src/content/windows.json'
import findings from '../src/content/findings.json'
import pathologies from '../src/content/pathologies.json'
import measurements from '../src/content/measurements.json'
import glossary from '../src/content/glossary.json'
import type { Window, Finding, Pathology, Measurement, GlossaryEntry } from '../src/content/types'

const fontes = {
  windows: windows as unknown as Window[],
  findings: findings as unknown as Finding[],
  pathologies: pathologies as unknown as Pathology[],
  measurements: measurements as unknown as Measurement[],
  glossary: glossary as unknown as GlossaryEntry[],
}

describe('buscar — busca global contra o conteúdo real', () => {
  it('query vazia não retorna nada (não é "mostrar tudo")', () => {
    const r = buscar('', fontes)
    expect(totalResultados(r)).toBe(0)
    const rEspacos = buscar('   ', fontes)
    expect(totalResultados(rEspacos)).toBe(0)
  })

  it('é acento-insensível e case-insensitive', () => {
    const comAcento = buscar('subxifóide', fontes)
    const semAcento = buscar('subxifoide', fontes)
    const maiuscula = buscar('SUBXIFOIDE', fontes)
    expect(totalResultados(comAcento)).toBeGreaterThan(0)
    expect(comAcento.windows.map((w) => w.id)).toEqual(semAcento.windows.map((w) => w.id))
    expect(comAcento.windows.map((w) => w.id)).toEqual(maiuscula.windows.map((w) => w.id))
  })

  it('acha uma janela pelo nome', () => {
    const r = buscar('espaço de morrison', fontes)
    expect(r.windows.some((w) => w.id === 'efast-recesso-hepatorrenal')).toBe(true)
  })

  it('acha um termo do glossário pela sigla e pelo termo completo', () => {
    const porSigla = buscar('TAPSE', fontes)
    expect(porSigla.glossary.length).toBeGreaterThan(0)
    const primeiro = porSigla.glossary[0]
    const porTermo = buscar(primeiro.termo, fontes)
    expect(porTermo.glossary.some((g) => g.id === primeiro.id)).toBe(true)
  })

  it('busca cruza os 5 tipos de conteúdo ao mesmo tempo (é isso que a torna "global")', () => {
    // "derrame" aparece em pelo menos janelas (subxifoide) e prováveis achados/glossário
    // — o teste garante que a função não pára no primeiro tipo que bate.
    const r = buscar('derrame', fontes)
    const tiposComResultado = [
      r.windows.length > 0,
      r.findings.length > 0,
      r.pathologies.length > 0,
      r.glossary.length > 0,
    ].filter(Boolean).length
    expect(tiposComResultado).toBeGreaterThanOrEqual(2)
  })

  it('termo inexistente não retorna nada em nenhum tipo', () => {
    const r = buscar('xyzxyzxyz-termo-que-nao-existe', fontes)
    expect(totalResultados(r)).toBe(0)
  })

  it('não inventa correspondência: só retorna itens cujo texto realmente contém a query', () => {
    const r = buscar('tapse', fontes)
    for (const w of r.windows) {
      const alvo = [w.nome, ...w.estruturasVisualizadas, ...w.oQueAvaliar].join(' ').toLowerCase()
      expect(alvo).toContain('tapse')
    }
  })
})
