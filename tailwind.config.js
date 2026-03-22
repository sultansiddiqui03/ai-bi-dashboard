/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['"DM Sans"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'surface': {
          '50': '#f8fafc',
          '100': '#f1f5f9',
          '800': '#0f172a',
          '850': '#0c1322',
          '900': '#080e1a',
          '950': '#050912',
        },
        'accent': {
          '400': '#38bdf8',
          '500': '#0ea5e9',
          '600': '#0284c7',
        },
        'emerald': {
          '400': '#34d399',
          '500': '#10b981',
        },
        'amber': {
          '400': '#fbbf24',
          '500': '#f59e0b',
        },
        'rose': {
          '400': '#fb7185',
          '500': '#f43f5e',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
