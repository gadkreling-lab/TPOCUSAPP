import { obterSenhaAdmin } from './senha'

export interface CodigoComStatus {
  codigo: string
  duracaoDias: number
  ativadoEm: number | null
  expiraEm: number | null
  deviceId: string | null
  ultimaRenovacaoEm: number | null
  revogado: boolean
  status: 'nao_ativado' | 'ativo' | 'expirado' | 'revogado'
}

async function chamarAdmin<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const senha = obterSenhaAdmin()
  const resp = await fetch(caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(senha ? { Authorization: `Bearer ${senha}` } : {}),
      ...opcoes.headers,
    },
  })
  const dados = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(typeof dados?.mensagem === 'string' ? dados.mensagem : `Erro ${resp.status}`)
  }
  return dados as T
}

/** Lança se a senha estiver incorreta — não guarda nada, ver src/admin/senha.ts. */
export async function login(senha: string): Promise<void> {
  const resp = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  })
  const dados = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(typeof dados?.mensagem === 'string' ? dados.mensagem : 'Senha incorreta.')
}

export async function listarCodigos(): Promise<CodigoComStatus[]> {
  const { codigos } = await chamarAdmin<{ codigos: CodigoComStatus[] }>('/api/admin/codigos')
  return codigos
}

export async function gerarCodigos(quantidade: number, duracaoDias: number): Promise<string[]> {
  const { codigos } = await chamarAdmin<{ codigos: string[] }>('/api/admin/codigos', {
    method: 'POST',
    body: JSON.stringify({ quantidade, duracaoDias }),
  })
  return codigos
}

export function revogarCodigo(codigo: string): Promise<void> {
  return chamarAdmin(`/api/admin/codigos/${encodeURIComponent(codigo)}`, {
    method: 'POST',
    body: JSON.stringify({ acao: 'revogar' }),
  })
}

export function estenderPrazo(codigo: string, dias: number): Promise<{ novoExpiraEm: number }> {
  return chamarAdmin(`/api/admin/codigos/${encodeURIComponent(codigo)}`, {
    method: 'POST',
    body: JSON.stringify({ acao: 'estender', dias }),
  })
}
