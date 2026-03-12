/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#15334e',
          light:   '#1c4468',
          dark:    '#0e2336',
        },
        bone: {
          DEFAULT: '#e2ded3',
          dark:    '#d4cfc3',
        },
        accent: {
          DEFAULT: '#f59e0b',
          light:   '#fbbf24',
        },
      },
    },
  },
  plugins: [],
}