export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#b3976b',
        },
        bg: {
          DEFAULT: '#fdfaf5',
        },
        text: {
          DEFAULT: '#4a4a4a',
        }
      },
      fontFamily: {
        serif: ['STZhongsong', 'Songti SC', 'SimSun', 'serif'],
      }
    },
  },
  plugins: [],
}
