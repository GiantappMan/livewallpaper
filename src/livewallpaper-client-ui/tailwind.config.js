/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        "app-theme": { 50: "#4474e3" },
        "app-dark": {
          50: "",
          100: "",
          200: "",
          300: "",
          400: "",
          500: "#ababab",
          600: "#454545",
          700: "#323232",
          800: "#272727",
          900: "#202020",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            code: {
              "white-space": "pre-wrap",
              "word-wrap": "break-word",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
