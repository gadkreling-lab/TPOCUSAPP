import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button'

const CHAVE = 'tpocus.disclaimerAceito.v1'

function jaAceitou(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}

/**
 * Disclaimer de primeiro uso — requisito de segurança clínica do produto (spec,
 * "Segurança clínica" item 1): ferramenta educacional, apoio ao raciocínio, não
 * substitui julgamento clínico nem exame formal. Mostrado uma vez, com aceite
 * explícito, antes de qualquer módulo ficar acessível.
 */
export function DisclaimerGate({ children }: { children: ReactNode }) {
  const [aceito, setAceito] = useState(jaAceitou)

  useEffect(() => {
    if (aceito) {
      try {
        localStorage.setItem(CHAVE, '1')
      } catch {
        // sem persistência: o disclaimer volta a aparecer na próxima carga — aceitável
      }
    }
  }, [aceito])

  if (aceito) return <>{children}</>

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold text-fg">Antes de começar</h1>
        <div className="mt-4 space-y-3 text-base text-fg">
          <p>
            O TPOCUS é uma <strong>ferramenta educacional</strong> para médicos, feita para
            apoiar o raciocínio clínico durante o treinamento e a prática de POCUS.
          </p>
          <p>
            Ele <strong>não substitui o julgamento clínico</strong> do examinador nem um
            exame de imagem formal. Toda calculadora, protocolo ou conteúdo do Atlas deve
            ser interpretado em conjunto com a história clínica e o exame físico do
            paciente.
          </p>
        </div>
        <Button bloco className="mt-6" onClick={() => setAceito(true)}>
          Entendi, continuar
        </Button>
      </div>
    </div>
  )
}
