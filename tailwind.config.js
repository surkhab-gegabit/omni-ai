/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ai-dark': '#1e1e2e',
        'ai-surface': '#2b2b40',
        'ai-primary': '#8b5cf6',
      }
    },
  },
  plugins: [],
}