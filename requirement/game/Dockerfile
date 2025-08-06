FROM node:20

WORKDIR /app
COPY ./game .
COPY ./shared .
RUN npm install
# RUN npm init -y

CMD ["npx", "ts-node", "server.ts"]
