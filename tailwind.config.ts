import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "#000000",
            a: {
              color: "#0066cc",
              textDecoration: "underline",
              fontWeight: "500",
            },
            h1: {
              color: "#000000",
              fontWeight: "800",
            },
            h2: {
              color: "#000000",
              fontWeight: "700",
            },
            h3: {
              color: "#000000",
              fontWeight: "600",
            },
            strong: {
              color: "#000000",
            },
            code: {
              color: "#000000",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
