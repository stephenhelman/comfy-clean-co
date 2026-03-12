import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black:    "#0A0A0A",
          charcoal: "#111111",
          card:     "#1A1A1A",
          border:   "#2A2A2A",
          blue: {
            DEFAULT: "#5BB8E8",
            light:   "#A8D8F0",
            dark:    "#2E86C1",
            glow:    "#5BB8E820",
          },
          white:  "#FFFFFF",
          silver: "#C0C0C0",
          gray: {
            light: "#D1D5DB",
            mid:   "#6B7280",
            dark:  "#374151",
          },
        },
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        inter:      ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
