/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    colors: {
      "menu-bg": "#202020",
      "content-bg": "#272727",
      "theme-color": "#5fb2f2",
    },
    extend: {
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
