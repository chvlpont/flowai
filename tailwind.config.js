/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        muted: "var(--bg-muted)",
        border: "var(--border)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        primary: "var(--accent-primary)",
        "primary-hover": "var(--accent-primary-hover)",
        "primary-bg": "var(--accent-primary-bg)",
        "primary-light": "var(--accent-primary-light)",
        "accent-purple": "var(--accent-purple)",
        "accent-green": "var(--accent-green)",
        "accent-yellow": "var(--accent-yellow)",
        "accent-orange": "var(--accent-orange)",
        "accent-red": "var(--accent-red)",
        "accent-cyan": "var(--accent-cyan)",
      },
      boxShadow: {
        DEFAULT: "var(--hover-shadow)",
      },
    },
  },
  plugins: [],
};
