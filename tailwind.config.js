/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':        '#121212',
        'bg-elevated':    '#1a1a1a',
        'bg-highlight':   '#282828',
        'bg-press':       '#333333',
        accent:           '#1db954',
        'accent-hover':   '#1ed760',
        'text-primary':   '#ffffff',
        'text-secondary': '#b3b3b3',
        'text-subdued':   '#535353',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        'fade-in':   'fadeIn 0.2s ease-in-out'
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
