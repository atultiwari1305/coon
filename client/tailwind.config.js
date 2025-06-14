/** @type {import('tailwindcss').Config} */
export default {
  // These paths tell Tailwind CSS where to scan for your utility classes.
  // This is crucial for Tailwind to generate the necessary CSS.
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}", // For JavaScript and JSX files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}