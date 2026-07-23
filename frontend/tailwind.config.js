/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f3ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        darkbg: '#0b0f19',
        darkcard: '#151c2c',
        darkborder: '#232d42',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
