/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        main: "var(--bg-main)",
        sidebar: "var(--bg-sidebar)",
        card: "var(--bg-card)",
        "card-hover": "var(--bg-card-hover)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        dim: "var(--text-dim)",
        muted: "var(--text-muted)",
        subtle: "var(--border-subtle)",
        glass: "var(--glass-bg)",
      },
      textColor: {
        main: "var(--text-main)",
        dim: "var(--text-dim)",
        muted: "var(--text-muted)",
      },
      borderColor: {
        subtle: "var(--border-subtle)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
