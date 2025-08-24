/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        prussian_blue: { DEFAULT: '#003049', 100: '#00090e', 200: '#00131d', 300: '#001c2b', 400: '#002539', 500: '#003049', 600: '#00679f', 700: '#00a0f7', 800: '#50c2ff', 900: '#a7e0ff' },
        fire_engine_red: { DEFAULT: '#d62828', 100: '#2b0808', 200: '#561010', 300: '#811818', 400: '#ac2020', 500: '#d62828', 600: '#df5353', 700: '#e77e7e', 800: '#efa9a9', 900: '#f7d4d4' },
        orange_wheel: { DEFAULT: '#f77f00', 100: '#311900', 200: '#623300', 300: '#934c00', 400: '#c46500', 500: '#f77f00', 600: '#ff982b', 700: '#ffb260', 800: '#ffcc95', 900: '#ffe5ca' },
        xanthous: { DEFAULT: '#fcbf49', 100: '#402b01', 200: '#815602', 300: '#c18203', 400: '#fbab0a', 500: '#fcbf49', 600: '#fdcd6e', 700: '#fdda92', 800: '#fee6b7', 900: '#fef3db' },
        vanilla: { DEFAULT: '#eae2b7', 100: '#413a13', 200: '#827426', 300: '#c2ae38', 400: '#d8c977', 500: '#eae2b7', 600: '#eee8c6', 700: '#f3eed4', 800: '#f7f4e3', 900: '#fbf9f1' }
      }
    }
  },
  plugins: []
}
