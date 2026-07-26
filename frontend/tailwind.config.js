/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          950: "#0A2E2E",
          900: "#0F3D3D",
          800: "#114B4B",
          700: "#166363",
          50: "#EEF6F5",
        },
        saffron: {
          600: "#C4841A",
          500: "#E0A526",
          400: "#EBBE5B",
          100: "#FBEFD4",
        },
        sand: {
          50: "#F6F5F0",
          100: "#F0EEE5",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
