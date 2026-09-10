import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react'

interface Props {
  src: string
  alt: string
  onFechar: () => void
}

const ESCALA_MIN = 1
const ESCALA_MAX = 4
// Duplo toque/clique alterna entre "normal" e este nível — valor arbitrário que já
// deixa detalhe fino de imagem de ultrassom legível sem exigir pinça pra tudo.
const ESCALA_DUPLO_TOQUE = 2.5

function distanciaEntreToques(a: React.Touch, b: React.Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

/**
 * Visualizador de imagem em tela cheia com zoom por pinça (touch) e roda do mouse
 * (desktop, pra quem testa/usa num computador). Sem biblioteca de gestos — o projeto
 * não tem nenhuma dependência de UI além de React, e o gesto necessário aqui
 * (pinça de 2 dedos + pan de 1 dedo quando ampliado) é simples o bastante pra não
 * justificar uma. Fundo bem escuro independente do tema do app — é assim que um
 * visualizador de imagem clínica em preto e branco (ultrassom) ganha contraste.
 */
export function VisualizadorImagem({ src, alt, onFechar }: Props) {
  const [escala, setEscala] = useState(1)
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 })
  const gesto = useRef<{
    distanciaInicial: number | null
    escalaInicial: number
    pontoInicial: { x: number; y: number } | null
    deslocamentoInicial: { x: number; y: number }
  }>({ distanciaInicial: null, escalaInicial: 1, pontoInicial: null, deslocamentoInicial: { x: 0, y: 0 } })

  // Esc fecha, e trava o scroll da página por trás enquanto o visualizador está
  // aberto (senão dá pra rolar o Atlas atrás da imagem em tela cheia).
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowOriginal
    }
  }, [onFechar])

  function limitarEscala(valor: number): number {
    return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, valor))
  }

  function alternarZoom() {
    if (escala > 1) {
      setEscala(1)
      setDeslocamento({ x: 0, y: 0 })
    } else {
      setEscala(ESCALA_DUPLO_TOQUE)
    }
  }

  function aoTocarIniciar(e: ReactTouchEvent<HTMLImageElement>) {
    if (e.touches.length === 2) {
      gesto.current.distanciaInicial = distanciaEntreToques(e.touches[0], e.touches[1])
      gesto.current.escalaInicial = escala
    } else if (e.touches.length === 1) {
      gesto.current.pontoInicial = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      gesto.current.deslocamentoInicial = deslocamento
    }
  }

  function aoTocarMover(e: ReactTouchEvent<HTMLImageElement>) {
    if (e.touches.length === 2 && gesto.current.distanciaInicial !== null) {
      e.preventDefault()
      const distanciaAtual = distanciaEntreToques(e.touches[0], e.touches[1])
      const fator = distanciaAtual / gesto.current.distanciaInicial
      setEscala(limitarEscala(gesto.current.escalaInicial * fator))
    } else if (e.touches.length === 1 && gesto.current.pontoInicial && escala > 1) {
      e.preventDefault()
      const dx = e.touches[0].clientX - gesto.current.pontoInicial.x
      const dy = e.touches[0].clientY - gesto.current.pontoInicial.y
      setDeslocamento({
        x: gesto.current.deslocamentoInicial.x + dx,
        y: gesto.current.deslocamentoInicial.y + dy,
      })
    }
  }

  function aoTocarFinalizar(e: ReactTouchEvent<HTMLImageElement>) {
    if (e.touches.length === 0) {
      gesto.current.distanciaInicial = null
      gesto.current.pontoInicial = null
      // Pinça pra baixo do mínimo "solta" a imagem de volta no lugar, em vez de
      // ficar num zoom menor que 1x (imagem menor que a tela, flutuando torta).
      if (escala <= 1) {
        setEscala(1)
        setDeslocamento({ x: 0, y: 0 })
      }
    }
  }

  function aoRolarMouse(e: React.WheelEvent<HTMLImageElement>) {
    e.preventDefault()
    setEscala((atual) => {
      const nova = limitarEscala(atual - e.deltaY * 0.0015 * atual)
      if (nova <= 1) setDeslocamento({ x: 0, y: 0 })
      return nova
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <button
        type="button"
        onClick={onFechar}
        aria-label="Fechar"
        className="absolute right-3 top-3 z-10 flex min-h-touch min-w-touch items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        ×
      </button>
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/60">
        {escala > 1 ? 'Arraste para mover · toque duas vezes para voltar' : 'Belisque ou toque duas vezes para ampliar'}
      </p>
      <img
        src={src}
        alt={alt}
        draggable={false}
        onTouchStart={aoTocarIniciar}
        onTouchMove={aoTocarMover}
        onTouchEnd={aoTocarFinalizar}
        onDoubleClick={alternarZoom}
        onWheel={aoRolarMouse}
        style={{ transform: `translate(${deslocamento.x}px, ${deslocamento.y}px) scale(${escala})` }}
        className="max-h-full max-w-full touch-none select-none object-contain"
      />
    </div>
  )
}
