FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ bash

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install --save-dev typescript ts-node

# Build Next.js
RUN npx next build

EXPOSE 3000

CMD ["npm", "start"]
