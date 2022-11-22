/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
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
