/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx,html}"],
  theme: {
    extend: {
      colors: {
        'ravr-bg': '#0a0d12',
        'ravr-panel': '#0f141b',
        'ravr-accent': '#38bdf8'
      }
    }
  },
  plugins: []
}
