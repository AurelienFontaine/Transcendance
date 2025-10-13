module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
	  "./pages/**/*.{js,ts,jsx,tsx}",	"./handlers/**/*.{js,ts,jsx,tsx}"

  ],  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ["light", "dark", "cupcake"],
  },
  safelist: [
  "min-h-screen", "bg-gray-900", "text-white", "p-4", "flex", "flex-col", "items-center", "justify-center", "text-5xl", "font-extrabold", "mb-6",
  "bg-gray-800", "p-8", "rounded-lg", "shadow-lg", "max-w-md", "w-full", "text-3xl", "font-bold", "text-center", "space-y-4", "block", "text-sm", "font-medium", "text-gray-300", "mb-1",
  "p-3", "rounded-md", "bg-gray-700", "border", "border-gray-600", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-500", "hover:bg-blue-700", "py-3", "px-4",
  "focus:ring-offset-2", "focus:ring-offset-gray-800", "text-red-500", "mt-4", "text-green-500",
  "max-w-6xl", "mx-auto", "mb-6", "md:flex-row", "gap-6", "md:w-1/3", "space-y-6", "bg-gray-700", , "rounded-lg", "shadow", "text-lg", "font-semibold", "mb-2", "flex-grow", "p-2",
  "text-black", "bg-gray-200", "focus:ring-green-500", "px-4", "py-2", "hover:bg-green-700", "transition-colors", "bg-red-600", "hover:bg-red-700", "focus:ring-red-500", "h-48", "overflow-y-auto",
  "flex-1", "flex-col", "mb-3", "disabled:opacity-50", "h-64", "overflow-y-auto", "p-3", "bg-gray-800", "text-gray-400", "mt-16", "md:w-1/4", "mt-2", "rounded-md", "flex-col", "items-center",
  "w-20", "h-20", "rounded-full", "object-cover", "border-2", "border-gray-500", "leading-tight", "text-sm", "text-gray-300", "text-xs", "mt-3",
  "max-w-4xl", "space-y-6", "text-xl", "sm:flex-row", "gap-4", "bg-blue-600", "hover:bg-blue-700", "text-lg", "bg-green-600", "hover:bg-green-700", "bg-purple-600", "hover:bg-purple-700",
  "bg-yellow-600", "hover:bg-yellow-700", "bg-gray-600", "hover:bg-gray-700", "bg-red-600", "hover:bg-red-700", "sm:flex-row", "gap-3", "bg-amber-600", "px-3", "py-1", "h-24", "relative",
  "border-2", "aspect-ratio:1/1", "inset-0", "z-10", "absolute", "top-4", "right-4", "shadow-lg", "width:220px", "font-size:0.9rem", "mt-1", "w-full", "h-8", "border-none", "mt-2",
  "max-w-2xl", "text-lg", "mt-4", "bg-yellow-600", "hover:bg-yellow-700", "py-2", "px-4", "transition-colors", "mx-auto", "object-cover", "p-2", "hover:bg-gray-600", "w-16", "h-16",
  "bg-blue-600", "hover:bg-blue-700", "bg-purple-600", "hover:bg-purple-700", "bg-red-600", "hover:bg-red-700", "bg-green-600", "hover:bg-green-700", "block", "w-full", "bg-blue-500",
  "hover:bg-blue-600", "flex", "items-center", "justify-center", "gap-2", "w-5", "h-5", "viewBox=\"0 0 24 24\"", "fill=\"currentColor\"", "path", "d=\"M12.24 10.24v3.52h6.08c-.24 1.44-.96 2.8-2.08 3.84l-.08.08-2.88 2.24c-1.76 1.36-4 2.16-6.4 2.16-4.96 0-9.04-4.08-9.04-9.04s4.08-9.04 9.04-9.04c2.64 0 4.88.96 6.64 2.64l2.48-2.48c-2.08-2.08-4.8-3.28-7.12-3.28-6.64 0-12 5.36-12 12s5.36 12 12 12c3.28 0 6.24-1.36 8.32-3.68 2.08-2.32 3.28-5.44 3.28-8.88 0-.8-.08-1.6-.24-2.32h-11.36z\"",
  "flex-wrap", "opacity-60", "text-black", "font-semibold", "text-xs", "opacity-70", "bg-gradient-to-br", "card-title", "btn-primary-300", "btn-ghost", "text-center",  "py-12",
  "inline-block", "animate-spin", "h-12", "w-12", "border-b-2", "border-primary-500", "hidden", "text-error-100", "flex-shrink-0", "bg-gradient-to-br", "from-blue-600", "to-blue-700",
  "-mx-[50vw]", "w-screen", "left-1/2", "right-1/2", "overflow-x-clip",
  
  // DaisyUI base layers
  { pattern: /bg-base-(100|200|300)/ },
  { pattern: /text-base-content/ },

  // Primary / Secondary / Accent text or buttons
  { pattern: /text-(primary|secondary|accent|neutral|info|success|warning|error|base-content)/ },
  { pattern: /bg-(primary|secondary|accent|neutral|info|success|warning|error|base-(100|200|300))/ },
  { pattern: /border-(primary|secondary|accent|neutral|info|success|warning|error)/ },
  { pattern: /btn-(primary|secondary|accent|neutral|ghost|info|success|warning|error)/ },

  // Common Tailwind hues (used in your code manually)
  { pattern: /(bg|text|hover:bg)-(blue|gray)-\d{2,3}/ },

  // Neutral
  { pattern: /bg-neutral(-\d{2,3})?/ },
  { pattern: /text-neutral(-\d{2,3})?/ },

  // Error state colors
  { pattern: /bg-error(-\d{2,3})?/ },
  { pattern: /text-error(-\d{2,3})?/ },
  { pattern: /border-error(-\d{2,3})?/ },

  // Info, Success, Warning (if used elsewhere)
  { pattern: /(bg|text|border)-(info|success|warning)(-\d{2,3})?/ },

  // Tailwind color names (blue/gray variants used manually)
  { pattern: /(bg|text|hover:bg)-(blue|gray)-\d{2,3}/ },

  // Utility classes dynamically combined (safe fallback)
  { pattern: /text-(xs|sm|base|lg|xl)/ },
  { pattern: /font-(medium|semibold)/ },
  { pattern: /(p|m|py|px|pt|pb|pl|pr|space-[xy])-\d+/ },
  { pattern: /(rounded|rounded-[a-z]+|shadow-[a-z]*)/ },
  ],

}
