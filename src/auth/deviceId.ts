// Identificador do aparelho — aleatório, gerado no cliente, guardado localmente.
// NÃO é PII: não identifica a pessoa, só o navegador/aparelho onde o código foi
// ativado. É o que permite o servidor impor "1 aparelho por código" (ver
// ARQUITETURA.md §6) sem pedir nome, e-mail ou qualquer dado do aluno.
const CHAVE = 'tpocus.deviceId'

export function obterDeviceId(): string {
  let id: string | null = null
  try {
    id = localStorage.getItem(CHAVE)
  } catch {
    // localStorage indisponível (modo privado restritivo, etc.) — segue sem persistir
  }
  if (id) return id

  id = crypto.randomUUID()
  try {
    localStorage.setItem(CHAVE, id)
  } catch {
    // sem persistência: um novo id será gerado na próxima carga, o que efetivamente
    // troca de "aparelho" aos olhos do servidor — aceitável nesse caso extremo, não
    // é o caminho normal.
  }
  return id
}
