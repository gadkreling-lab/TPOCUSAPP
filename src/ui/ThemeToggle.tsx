import { useEffect, useState } from 'react'

const CHAVE = 'tpocus.tema'

function lerPreferencia(): 'dark' | 'light' {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'dark' || salvo === 'light') return salvo
  } catch {
    // sem localStorage — segue com o padrão do produto
  }
  return 'dark' // modo escuro é o padrão do produto — sala de exame com luz baixa
}

/** Alterna a classe `dark` em <html>. Modo escuro é o padrão; isto é a exceção. */
export function ThemeToggle() {
  const [tema, setTema] = useState<'dark' | 'light'>(lerPreferencia)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      // sem persistência: a escolha vale só para esta sessão
    }
  }, [tema])

  return (
    <button
      type="button"
      onClick={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-pressed={tema === 'light'}
      className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-xl border border-border bg-surface text-fg hover:bg-border/30"
      title={tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      <span aria-hidden="true">{tema === 'dark' ? '☀️' : '🌙'}</span>
      <span className="sr-only">{tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}</span>
    </button>
  )
}
