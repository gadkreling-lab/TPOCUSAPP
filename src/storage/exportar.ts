import type { SessaoExame } from './tipos'

/**
 * Formata a sessão como texto simples (copiável/compartilhável). Sempre termina com a
 * mesma ressalva de integração clínica do resto do app — o resumo exportado não é
 * exceção à regra de nunca sugerir uma conclusão isolada (spec de segurança clínica,
 * ARQUITETURA.md/CLAUDE.md).
 */
export function formatarSessaoParaTexto(sessao: SessaoExame, agora: () => Date = () => new Date()): string {
  const linhas: string[] = []
  linhas.push(`Sessão de exame POCUS — ${sessao.titulo}`)
  linhas.push(`Gerado em ${agora().toLocaleString('pt-BR')}`)
  linhas.push('')

  if (sessao.entradas.length === 0) {
    linhas.push('(nenhum item adicionado ainda)')
  }

  for (const e of sessao.entradas) {
    if (e.tipo === 'calculadora') {
      linhas.push(`## ${e.calculadoraNome}`)
      linhas.push(`- ${e.label}: ${e.valor} ${e.unidade} — ${e.texto}`)
    } else if (e.tipo === 'protocolo') {
      const diagnostico = Array.isArray(e.diagnostico) ? e.diagnostico.join(' + ') : e.diagnostico
      linhas.push(`## Protocolo ${e.protocoloNome}`)
      linhas.push(`- Conclusão: ${diagnostico} (confiança: ${e.confianca})`)
      linhas.push(`- ${e.justificativa}`)
      for (const passo of e.proximosPassos) linhas.push(`  · ${passo}`)
      linhas.push(`- ${e.cuidado}`)
    } else {
      linhas.push('## Evolução')
      linhas.push(e.texto)
    }
    linhas.push('')
  }

  linhas.push('---')
  linhas.push(
    'Resumo gerado pelo app TPOCUS, apoio ao raciocínio clínico. Não substitui o exame ' +
      'clínico, a supervisão do curso, o julgamento clínico nem o prontuário oficial — ' +
      'nenhuma conclusão aqui deve ser usada isoladamente.',
  )
  return linhas.join('\n')
}
