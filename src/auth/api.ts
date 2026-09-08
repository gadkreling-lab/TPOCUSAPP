// Chamadas HTTP para os endpoints de acesso (api/ativar.ts, api/renovar.ts).
// Ver ARQUITETURA.md §6.

export interface RespostaSessao {
  tokenAcesso: string
  tokenRenovacao: string
  expiraEm: number
}

export interface RespostaErro {
  motivo: string
  mensagem: string
}

export type ResultadoApi = { ok: true; sessao: RespostaSessao } | { ok: false; erro: RespostaErro }

async function chamar(caminho: string, corpo: unknown): Promise<ResultadoApi> {
  let resp: Response
  try {
    resp = await fetch(caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  } catch {
    return { ok: false, erro: { motivo: 'sem_conexao', mensagem: 'Verifique sua conexão e tente novamente.' } }
  }

  let dados: unknown
  try {
    dados = await resp.json()
  } catch {
    return { ok: false, erro: { motivo: 'resposta_invalida', mensagem: 'Resposta inesperada do servidor.' } }
  }

  if (!resp.ok) {
    const erro = dados as Partial<RespostaErro>
    return {
      ok: false,
      erro: { motivo: erro.motivo ?? 'erro_desconhecido', mensagem: erro.mensagem ?? 'Não foi possível continuar.' },
    }
  }
  return { ok: true, sessao: dados as RespostaSessao }
}

export function ativarCodigo(codigo: string, deviceId: string): Promise<ResultadoApi> {
  return chamar('/api/ativar', { codigo, deviceId })
}

export function renovarSessao(tokenRenovacao: string): Promise<ResultadoApi> {
  return chamar('/api/renovar', { tokenRenovacao })
}
