import type { Config } from 'tailwindcss'

// Modo escuro por padrão (index.html já carrega <html class="dark">); alternância
// remove a classe. Cores como variáveis CSS (ver src/index.css) trocadas por .dark —
// assim `bg-bg`, `text-fg` etc. já respondem ao tema sem precisar de `dark:` em toda
// classe. Ver ARQUITETURA.md §7 — Design system.
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--color-bg'),
        surface: withOpacity('--color-surface'),
        fg: withOpacity('--color-fg'),
        muted: withOpacity('--color-muted'),
        border: withOpacity('--color-border'),
        accent: withOpacity('--color-accent'),
        'accent-fg': withOpacity('--color-accent-fg'),
        normal: withOpacity('--color-normal'),
        limitrofe: withOpacity('--color-limitrofe'),
        alterado: withOpacity('--color-alterado'),
      },
      fontSize: {
        // clamp() para legibilidade a meio metro, ver ARQUITETURA.md §7
        base: ['clamp(1rem, 0.9rem + 0.4vw, 1.125rem)', '1.5'],
        lg: ['clamp(1.125rem, 1rem + 0.5vw, 1.375rem)', '1.4'],
        xl: ['clamp(1.375rem, 1.2rem + 0.7vw, 1.75rem)', '1.3'],
      },
      spacing: {
        touch: '2.75rem', // 44px — alvo de toque mínimo
      },
      // minHeight/minWidth NÃO herdam `spacing` automaticamente no Tailwind —
      // precisam da própria extensão para `min-h-touch`/`min-w-touch` existirem.
      minHeight: {
        touch: '2.75rem',
      },
      minWidth: {
        touch: '2.75rem',
      },
    },
  },
  plugins: [],
} satisfies Config
