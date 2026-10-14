/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * ID de métrica do Google Analytics (GA4), formato "G-XXXXXXXXXX". Opcional — ver
   * src/analytics.ts. Só existe em Production no Vercel (Environment Variables),
   * nunca em dev local; ausente = analytics desligado, não é erro.
   */
  readonly VITE_GA_MEASUREMENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
