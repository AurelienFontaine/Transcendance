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
 
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pong SPA</title>
  <link href="/src/styles.css" rel="stylesheet" />
  <script type="module" src="/src/main.ts"></script>
  <!--<script src="https://cdn.tailwindcss.com"></script>-->
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <nav class="justify-between items-center p-4 bg-gray-800 flex gap-4">
    <a href="/" data-link class="hover:underline">Home</a>
    <a href="/profile" data-link class="hover:underline">Profile</a>
    <!-- <a href="/play" data-link class="hover:underline">Play</a> -->
  </nav>

  <main id="app" class="p-6">
    <!-- Views get rendered here -->
  </main>
</body>
</html>

*/
