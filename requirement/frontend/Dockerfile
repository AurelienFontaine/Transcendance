# Étape 1 : Build avec Node
FROM node:22-alpine3.20 AS builder

WORKDIR /app

# Installer dépendances frontend
COPY frontend/package*.json ./
RUN npm install
RUN npm install --save-dev esbuild

# Copier sources et handlers
COPY frontend .
COPY shared ./handlers

# Compiler TypeScript et Tailwind
RUN npx esbuild src/main.ts --bundle --outfile=dist/main.js --minify --sourcemap
RUN npx tailwindcss -i src/input.css -o dist/output.css --minify
RUN cp index.html dist

# Étape 2 : Nginx
FROM nginx:1.27-alpine

# Copier le build depuis builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier le nginx.conf complet
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copier certificats
COPY frontend/certs /etc/nginx/certs

EXPOSE 8080 443

CMD ["nginx", "-g", "daemon off;"]
