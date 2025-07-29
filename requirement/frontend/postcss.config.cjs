module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
/**
 * Configuration PostCSS
 *
 * Ce fichier configure les plugins utilisés par PostCSS, un outil de transformation CSS.
 * Il est écrit en CommonJS (avec module.exports) pour garantir la compatibilité avec tous les outils frontend modernes (Vite, Webpack, etc.).
 *
 * Ici, deux plugins sont activés :
 * - tailwindcss : génère les classes CSS utilitaires à partir de la config Tailwind.
 * - autoprefixer : ajoute automatiquement les préfixes CSS nécessaires pour la compatibilité entre navigateurs (ex : -webkit-, -moz-, etc.).
 *
 * Ce fichier est généralement détecté automatiquement par les outils de build lorsqu’ils traitent les fichiers CSS.
 * Il ne nécessite aucune importation manuelle dans le code.
 *
 * ⚠️ Ce fichier doit rester au format CommonJS (.cjs) pour éviter toute erreur de chargement dans les environnements qui ne supportent pas encore ES Modules (import/export).
 */
