/**
 * Google Analytics (GA4) — só métricas de acesso agregadas (visitas, páginas vistas),
 * nunca conteúdo clínico nem dado pessoal. O caminho de página (ex. "/janelas/<id>") é
 * a única coisa enviada — o mesmo que já fica visível na barra de endereço do
 * navegador. Não é "conteúdo" no sentido da Regra 1/2 do CLAUDE.md (que protege o
 * TEXTO do ebook, nunca extraído nem resumido aqui) — é só saber que alguém abriu
 * aquela rota, igual qualquer analytics de site.
 *
 * Só ativa se VITE_GA_MEASUREMENT_ID estiver definida no build (Vercel → Environment
 * Variables, escopo Production — ver DEPLOY.md §5). Ausente (dev local, Preview sem a
 * variável): nenhum script carregado, nenhuma requisição de rede, nenhum erro — as
 * duas funções abaixo viram no-op.
 *
 * ID de métrica do GA4 não é segredo (fica visível em texto puro em qualquer site que
 * usa GA, inclusive pelo "ver código-fonte" do navegador) — por isso não precisa do
 * mesmo cuidado de ADMIN_PASSWORD/TOKEN_SECRET; ainda assim fica em variável de
 * ambiente, não hardcoded, pra trocar de propriedade do GA sem precisar mexer em
 * código.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

let inicializado = false

/** Chamar uma vez, na montagem do app (ver src/app/App.tsx). Idempotente. */
export function inicializarAnalytics(): void {
  if (inicializado || !MEASUREMENT_ID) return
  inicializado = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag = gtag
  gtag('js', new Date())
  // send_page_view desligado de propósito: a navegação do app é client-side (wouter),
  // uma troca de rota não recarrega a página — sem isso, o GA só veria a PRIMEIRA
  // página de cada visita. registrarPageView() manda o page_view certo a cada troca.
  gtag('config', MEASUREMENT_ID, { send_page_view: false })
}

/** Chamar a cada troca de rota (ver src/app/App.tsx, no useLocation do wouter). */
export function registrarPageView(caminho: string): void {
  if (!MEASUREMENT_ID || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', { page_path: caminho, page_location: window.location.href })
}
