/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(241 243 249 / <alpha-value>)',
        bg2: 'rgb(255 255 255 / <alpha-value>)',
        bg3: 'rgb(248 250 255 / <alpha-value>)',
        border: 'rgb(23 35 78 / 0.08)',
        'border-hi': 'rgb(23 35 78 / 0.16)',
        gold: 'rgb(72 94 255 / <alpha-value>)',
        'gold-dim': 'rgb(72 94 255 / 0.12)',
        'gold-glow': 'rgb(72 94 255 / 0.2)',
        text: 'rgb(24 30 55 / <alpha-value>)',
        'text-2': 'rgb(74 84 118 / <alpha-value>)',
        'text-3': 'rgb(126 136 166 / <alpha-value>)',
        green: 'rgb(26 155 109 / <alpha-value>)',
        'green-dim': 'rgb(26 155 109 / 0.12)',
        red: 'rgb(220 85 75 / <alpha-value>)',
        'red-dim': 'rgb(220 85 75 / 0.12)',
      },
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
