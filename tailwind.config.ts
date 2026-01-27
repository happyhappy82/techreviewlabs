import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        // 노서치 색상 시스템
        ns: {
          text: "#1A1A1A",
          "text-secondary": "#1F1F1F",
          bg: "#F9F9F9",
          border: "#DFDFDF",
          // 점수 색상
          green: "#00B574",
          blue: "#36B7FF",
          orange: "#FF9900",
          red: "#FF455B",
          // 뱃지/강조
          "badge-green": "#00997E",
          "accent-blue": "#256FFF",
        },
      },
      fontFamily: {
        pretendard: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      fontSize: {
        // 노서치 타이포그래피
        "ns-title": ["22px", { lineHeight: "1.3", fontWeight: "800" }],
        "ns-h3": ["15px", { lineHeight: "1.5", fontWeight: "500" }],
        "ns-score-lg": ["16px", { lineHeight: "1", fontWeight: "800" }],
        "ns-score": ["14px", { lineHeight: "1", fontWeight: "700" }],
        "ns-label": ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        "ns-badge": ["11px", { lineHeight: "1", fontWeight: "700" }],
        "ns-small": ["12px", { lineHeight: "1.4", fontWeight: "700" }],
      },
      borderRadius: {
        ns: "10px",
      },
      maxWidth: {
        ns: "1000px",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "#1A1A1A",
            a: {
              color: "#256FFF",
              textDecoration: "underline",
              fontWeight: "500",
            },
            h1: {
              color: "#1A1A1A",
              fontWeight: "800",
            },
            h2: {
              color: "#1A1A1A",
              fontWeight: "700",
              fontSize: "22px",
              marginTop: "2.5rem",
              marginBottom: "1rem",
            },
            h3: {
              color: "#1A1A1A",
              fontWeight: "600",
              fontSize: "18px",
            },
            strong: {
              color: "#1A1A1A",
            },
            code: {
              color: "#1A1A1A",
            },
            table: {
              fontSize: "14px",
            },
            th: {
              backgroundColor: "#F9F9F9",
              fontWeight: "700",
              padding: "10px",
            },
            td: {
              padding: "10px",
              borderBottomColor: "#DFDFDF",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
