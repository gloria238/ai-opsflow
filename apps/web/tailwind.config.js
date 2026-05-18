/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#fafafa",
          alt: "#f4f4f5",
          hover: "#e4e4e7",
        },
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        sm: "0.5rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        "xs": "0 1px 2px 0 rgb(0 0 0 / 0.03)",
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
        "card-hover": "0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        "card-xl": "0 8px 24px -4px rgb(0 0 0 / 0.08), 0 2px 6px -1px rgb(0 0 0 / 0.04)",
        "panel": "0 4px 16px -4px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
        "panel-xl": "0 12px 32px -8px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)",
        "glass": "0 0 0 1px rgb(255 255 255 / 0.08), 0 4px 16px -8px rgb(0 0 0 / 0.12)",
        "glass-hover": "0 0 0 1px rgb(255 255 255 / 0.12), 0 8px 24px -8px rgb(0 0 0 / 0.16)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "flash-green": {
          "0%": { boxShadow: "inset 0 0 0 0 rgba(16,185,129,0)" },
          "30%": { boxShadow: "inset 0 0 0 2px rgba(16,185,129,0.4)" },
          "100%": { boxShadow: "inset 0 0 0 0 rgba(16,185,129,0)" },
        },
        "flash-red": {
          "0%": { boxShadow: "inset 0 0 0 0 rgba(239,68,68,0)" },
          "20%": { boxShadow: "inset 0 0 0 2px rgba(239,68,68,0.4)" },
          "40%": { boxShadow: "inset 0 0 0 0 rgba(239,68,68,0)" },
          "60%": { boxShadow: "inset 0 0 0 2px rgba(239,68,68,0.4)" },
          "100%": { boxShadow: "inset 0 0 0 0 rgba(239,68,68,0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "draw-line": {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        "skeleton": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "flash-green": "flash-green 0.8s ease-out",
        "flash-red": "flash-red 0.6s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.25s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "draw-line": "draw-line 1s linear forwards",
        "skeleton": "skeleton 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
