/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Tea estate / rainforest — primary ink & surfaces
        teal: {
          950: "#0A2E2E",
          900: "#0F3D3D",
          800: "#114B4B",
          700: "#166363",
          600: "#1C7A7A",
          100: "#DCEAE8",
          50: "#EEF6F5",
        },
        // Temple flags & spice markets — the warm accent
        saffron: {
          700: "#9C6512",
          600: "#C4841A",
          500: "#E0A526",
          400: "#EBBE5B",
          100: "#FBEFD4",
        },
        // Ratnapura gem trade — reserved for alerts, live status, SOS
        ruby: {
          700: "#6C1B27",
          600: "#8F2635",
          500: "#B23A49",
          400: "#CE5D6B",
          100: "#F7E3E6",
        },
        // Coastline — background & paper
        sand: {
          100: "#F0EEE5",
          50: "#F6F5F0",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,46,46,0.06), 0 8px 24px -12px rgba(10,46,46,0.18)",
        lift: "0 12px 32px -8px rgba(10,46,46,0.28)",
      },
      backgroundImage: {
        perforation:
          "radial-gradient(circle, rgba(10,46,46,0.16) 1.5px, transparent 1.5px)",
      },
      backgroundSize: {
        perforation: "10px 10px",
      },
      keyframes: {
        "stamp-in": {
          "0%": { opacity: 0, transform: "scale(1.5) rotate(-14deg)" },
          "60%": { opacity: 1, transform: "scale(0.92) rotate(-9deg)" },
          "100%": { opacity: 1, transform: "scale(1) rotate(-9deg)" },
        },
      },
      animation: {
        "stamp-in": "stamp-in 0.4s cubic-bezier(.2,.8,.3,1.2)",
      },
    },
  },
  plugins: [],
};
