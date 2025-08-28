module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
	"./page/**/*.{js,ts,jsx,tsx}",
	"./handlers/**/*.{js,ts,jsx,tsx}"
  ],  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    "bg-green-600",
    "bg-red-600",
    "text-white",
    "gap-3",
    "px-2",
    "py-0.5",
    "rounded",
    "font-bold",
    "text-xs",
    "text-green-600", "text-red-600",
    "bg-green-200", "bg-red-200",
    "border-green-400", "border-red-400",
  ],
}
