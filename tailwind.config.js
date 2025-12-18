/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.{ts,tsx,js,jsx}',
    './index.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './contexts/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
    './translations.{ts,js}',
    './constants.{ts,js}',
    './types.{ts,js}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
};
