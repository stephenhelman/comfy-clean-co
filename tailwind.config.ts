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
          navy: {
            DEFAULT: '#2B5C78',
            dark:    '#1A3A4A',
            light:   '#3A7A9C',
          },
          green: {
            DEFAULT: '#51A755',
            dark:    '#3D8040',
            light:   '#6DC272',
            pale:    '#E8F5E9',
          },
          gray: {
            light: '#ECECEC',
            mid:   '#9CA3AF',
            dark:  '#374151',
          },
          white:      '#FFFFFF',
          'off-white': '#F9FAFB',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter:   ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
