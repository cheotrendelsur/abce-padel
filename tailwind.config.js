/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a56db',
          light:   '#3b82f6',
          dark:    '#1e40af',
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