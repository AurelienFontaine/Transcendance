FROM node:22-alpine3.21

# Créer le dossier de travail
WORKDIR /app/frontend

# Copier le HTML et le TS
COPY ./frontend .
COPY ./shared ./handlers
RUN apk --no-cache add curl

# Installer les dependences dans package.json
RUN npm install
RUN npm install @tailwindcss/vite

RUN npm run build
# compiler Tailwind CSS (src/styles.css → src/dist/styles.css)
RUN npx tailwindcss -i src/styles.css -o dist/styles.css --minify

# Exposer le port 8080
EXPOSE 8080

# Lancer un serveur sur /app
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
