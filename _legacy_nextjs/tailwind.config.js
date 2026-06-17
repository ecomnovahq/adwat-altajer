/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-arabic)', 'Tajawal', 'Noto Sans Arabic', 'Arial', 'sans-serif'],
        arabic: ['Tajawal', 'sans-serif'],
      },
      colors: {
        gray: {
          950: '#0a0a0f',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
