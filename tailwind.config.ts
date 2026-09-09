import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        dna: {
          bg: "#0a0e14",
          panel: "#10161f",
          panel2: "#151d29",
          border: "#1e2937",
          border2: "#2a3a4d",
          text: "#dbe4ee",
          muted: "#8b9cb0",
          faint: "#5c6c80",
          accent: "#38bdf8",
          cyan: "#22d3ee",
          green: "#34d399",
          red: "#f87171",
          amber: "#fbbf24",
          blue: "#60a5fa",
          purple: "#a78bfa",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;