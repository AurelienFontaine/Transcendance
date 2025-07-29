FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y sqlite3

RUN mkdir -p ./data

RUN npm init -y

RUN npm install

COPY . .

RUN npm install fastify @fastify/cors better-sqlite3 @fastify/jwt

RUN npm install bcrypt

EXPOSE 3000

CMD ["node", "index.js"]