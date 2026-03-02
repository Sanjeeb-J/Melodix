/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "sp-black": "#000000",
        "sp-dark": "#121212",
        "sp-surface": "#181818",
        "sp-elevated": "#242424",
        "sp-hover": "#282828",
        "sp-border": "rgba(255,255,255,0.05)",
        "sp-text": "#ffffff",
        "sp-dim": "#b3b3b3",
        "sp-muted": "#6a6a6a",
        "sp-green": "#1db954",
        "sp-green-h": "#1ed760",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      height: {
        player: "90px",
      },
    },
  },
  plugins: [],
};
