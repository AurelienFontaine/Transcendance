// vite.config.js
import tailwindcssVite from '@tailwindcss/vite';

export default {
  root: '.', // la racine du projet
  build: {
    outDir: 'dist',
  },
  css: {
    postcss: './postcss.config.cjs' // charge explicitement ton fichier PostCSS si besoin
  }
}

/**
 * Configuration de Vite
 *
 * Ce fichier déclare les réglages de base pour le projet.
 * - `root`: définit le répertoire racine du projet (ici, le dossier courant).
 * - `build.outDir`: précise où seront générés les fichiers optimisés pour la production.
 *
 * Ce fichier est utilisé automatiquement lorsque l'on exécute `vite` ou `vite build`.

*/
