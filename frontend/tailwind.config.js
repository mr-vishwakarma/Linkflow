/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif']
      },
      colors: {
        cream: {
          bg: '#fbfaf7',
          card: '#ffffff',
          border: '#e7e5e4', // stone-200
          text: '#1c1917'    // stone-900
        }
      }
    },
  },
  plugins: [],
}
