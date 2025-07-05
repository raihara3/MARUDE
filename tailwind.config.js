/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFEF7',
          100: '#FFFDF0',
          200: '#FFF9E1',
          300: '#FFF5D3',
          400: '#FFF1C4',
          500: '#FFEDB5',
          600: '#FFE9A6',
          700: '#FFE597',
          800: '#FFE188',
          900: '#FFDD7A',
        },
        warm: {
          gray: '#F5F5F0',
          beige: '#F7F3ED',
        }
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'soft': '1rem',
        'softer': '1.5rem',
      },
    },
  },
  plugins: [
    '@tailwindcss/forms',
  ],
}