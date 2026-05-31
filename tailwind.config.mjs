/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: { accent: { DEFAULT: '#0a84ff', soft: '#409cff' } },
      fontSize: { '2xs': '11px' },
      fontFamily: {
        sf: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        fadein: { '0%': { opacity: 0, transform: 'scale(.98)' }, '100%': { opacity: 1, transform: 'scale(1)' } }
      },
      animation: { fadein: 'fadein .18s ease-out' }
    }
  },
  plugins: []
}
