import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // fontSize di-override penuh (bukan extend) supaya SEMUA class text-*
    // di seluruh aplikasi naik ~1px dari default Tailwind, tanpa ikut
    // membesarkan spacing/padding (yang tetap pakai skala rem default,
    // karena hanya fontSize yang di-override, bukan seluruh theme).
    fontSize: {
      xs: ["0.8125rem", { lineHeight: "1rem" }], // 13px (default 12px)
      sm: ["0.9375rem", { lineHeight: "1.25rem" }], // 15px (default 14px)
      base: ["1.0625rem", { lineHeight: "1.5rem" }], // 17px (default 16px)
      lg: ["1.1875rem", { lineHeight: "1.75rem" }], // 19px (default 18px)
      xl: ["1.3125rem", { lineHeight: "1.75rem" }], // 21px (default 20px)
      "2xl": ["1.5625rem", { lineHeight: "2rem" }], // 25px (default 24px)
      "3xl": ["1.9375rem", { lineHeight: "2.25rem" }], // 31px (default 30px)
      "4xl": ["2.3125rem", { lineHeight: "2.5rem" }], // 37px (default 36px)
      "5xl": ["3.0625rem", { lineHeight: "1" }], // 49px (default 48px)
      "6xl": ["3.8125rem", { lineHeight: "1" }], // 61px (default 60px)
    },
    extend: {
      colors: {
        ink: "#1a1a1a",
        paper: "#f4f7fc",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
