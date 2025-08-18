FROM node:22-alpine3.21

WORKDIR /app/chat

COPY package.json tsconfig.json ./

RUN npm install

COPY src ./src

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]