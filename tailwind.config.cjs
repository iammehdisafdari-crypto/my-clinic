/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#10b981",   // سبز پزشکی زمردی
          dark: "#0a0a0a",    // مشکی شیک
          light: "#ffffff",   // سفید
          muted: "#f4f4f5",   // خاکستری روشن پس‌زمینه
        },
      },
    },
  },
  plugins: [],
}