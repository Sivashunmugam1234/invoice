/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0e0e10',
        bg2: '#141416',
        bg3: '#1a1a1e',
        border: 'rgba(255,255,255,0.07)',
        'border-hi': 'rgba(255,255,255,0.14)',
        gold: '#c9a84c',
        'gold-dim': 'rgba(201,168,76,0.15)',
        'gold-glow': 'rgba(201,168,76,0.25)',
        text: '#f0ede8',
        'text-2': '#9b9690',
        'text-3': '#5a5750',
        green: '#4caf82',
        'green-dim': 'rgba(76,175,130,0.12)',
        red: '#e05a4e',
        'red-dim': 'rgba(224,90,78,0.12)',
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
