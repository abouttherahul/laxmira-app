/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js",
    "./public/components/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'main': '#e2bb67',
      },
    },
  },
  plugins: [],
}

