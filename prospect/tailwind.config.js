/** @type {import('tailwindcss').Config} */
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-tema="escuro"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        fundo: v('fundo'),
        folha: v('folha'),
        realce: v('realce'),
        fio: v('fio'),
        tinta: { DEFAULT: v('tinta'), 2: v('tinta-2'), 3: v('tinta-3') },
        sinal: { DEFAULT: v('sinal'), forte: v('sinal-forte') },
        ok: v('ok'),
        alerta: v('alerta'),
        info: v('info'),
        reuniao: v('reuniao'),
      },
      borderRadius: { DEFAULT: '6px', lg: '10px' },
      boxShadow: {
        flutua: '0 1px 0 rgb(var(--fio) / 1), 0 12px 32px -12px rgb(0 0 0 / .25)',
      },
      keyframes: {
        entra: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        pulsa: { '0%,100%': { opacity: 1 }, '50%': { opacity: .35 } },
      },
      animation: {
        entra: 'entra .18s cubic-bezier(.2,.7,.1,1)',
        pulsa: 'pulsa 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
