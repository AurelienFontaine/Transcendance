FROM node:20

WORKDIR /app
COPY ./game .
COPY ./shared .
RUN npm install
RUN npm i --save-dev @types/node

# RUN npm init -y

CMD ["npx", "ts-node", "server.ts"]
