/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {},
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
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
};
