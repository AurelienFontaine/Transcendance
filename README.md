# Transcendance


Transcendance est un projet web complet de type "fullstack" développé dans le cadre du cursus 42. Il s'agit d'une plateforme de jeu en ligne inspirée du Pong, enrichie de fonctionnalités sociales avancées (amis, chat, avatars, tournois, 2FA, etc.).

## Aperçu en images

![Accueil](imgs/Screenshot%20from%202025-10-13%2015-54-00.png)
![Connexion](imgs/Screenshot%20from%202025-10-13%2015-54-23.png)
![Dashboard](imgs/Screenshot%20from%202025-10-13%2015-58-51.png)
![Jeu Pong](imgs/Screenshot%20from%202025-10-13%2016-01-40.png)
![Profil](imgs/Screenshot%20from%202025-10-13%2016-01-50.png)
![Tournoi](imgs/Screenshot%20from%202025-10-13%2016-02-15.png)

## Objectif du projet

- Créer une application web interactive permettant à des utilisateurs de jouer à Pong en temps réel.
- Offrir une expérience sociale complète : gestion d'amis, chat, avatars personnalisés, tournois, statistiques, etc.
- Sécuriser l'accès avec une authentification forte (2FA, OAuth Google).
- Déployer l'ensemble via Docker pour garantir la portabilité et la simplicité d'installation.

## Fonctionnalités principales

- **Jeu Pong multijoueur en temps réel** (WebSocket)
- **Gestion d'utilisateurs** (inscription, login, 2FA, OAuth Google)
- **Système d'amis** (ajout, suppression, gestion des invitations)
- **Chat en temps réel**
- **Tournois et classements**
- **Avatars personnalisés**
- **Statistiques de jeu**
- **Déploiement Dockerisé**

## Architecture du projet

Le projet est découpé en plusieurs services :

- **Backend** (`requirement/backend/`) :
  - Node.js (Express)
  - Gestion des routes API (auth, user, game, etc.)
  - WebSocket pour le jeu et la présence en ligne
  - Base de données (à configurer, ex: PostgreSQL)
- **Frontend** (`requirement/frontend/`) :
  - TypeScript, HTML, CSS (TailwindCSS)
  - Application SPA (Single Page Application)
  - Gestion de l’UI, WebSocket, appels API
  - Nginx pour le reverse proxy
- **Game Server** (`game/`) :
  - Serveur Node.js dédié à la logique du jeu Pong
  - Communication en temps réel via WebSocket
- **Shared** (`shared/`) :
  - Code TypeScript partagé entre le front et le back (types, helpers, logique de jeu)
- **Docker** :
  - Conteneurisation de tous les services (backend, frontend, game server, base de données)
  - Fichiers `Dockerfile` et `docker-compose.yml`

## Technologies utilisées

- **Node.js** (Express)
- **TypeScript** (front, back, shared)
- **WebSocket** (Socket.IO)
- **PostgreSQL** (ou autre SGBD, à configurer)
- **Docker & Docker Compose**
- **Nginx** (reverse proxy)
- **TailwindCSS** (UI)
- **OAuth 2.0** (Google)
- **2FA** (Two-Factor Authentication)

## Installation et utilisation

### Prérequis
- [Docker](https://www.docker.com/) et [Docker Compose](https://docs.docker.com/compose/)
- (Optionnel) Node.js et npm si vous souhaitez lancer les services sans Docker

### Lancement rapide avec Docker

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/AurelienFontaine/Transcendance.git
   cd Transcendance/requirement
   ```
2. **Générer les certificats SSL (optionnel, pour HTTPS local)**
   ```bash
   ./../generate-ssl.sh
   ```
3. **Lancer l’application**
   ```bash
   docker-compose up --build
   ```
4. Accéder à l’application :
   - [https://localhost:8443](https://localhost:443) ou remplacer localhost par l'ip donner a la fin du make

### Lancement manuel (développement)

- **Backend**
  ```bash
  cd requirement/backend
  npm install
  npm start
  ```
- **Frontend**
  ```bash
  cd requirement/frontend
  npm install
  npm run dev
  ```
- **Game Server**
  ```bash
  cd game
  npm install
  npm run start
  ```

## Structure des dossiers

- `requirement/backend/` : API, WebSocket, logique serveur
- `requirement/frontend/` : SPA, UI, gestion client
- `game/` : serveur de jeu Pong
- `shared/` : code TypeScript partagé
- `requirement/docker-compose.yml` : orchestration des services


## Auteurs
- Projet réalisé par [AurelienFontaine](https://github.com/AurelienFontaine) et l’équipe Transcendance dans le cadre du cursus 42.

## Licence
Ce projet est sous licence MIT.
