FROM node:20-alpine AS base

# Create app directory
WORKDIR /usr/src/app

COPY package*.json .
RUN npm install --omit=dev
RUN npm install -D @nestjs/cli

FROM base AS build

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app
COPY . .

ENV NODE_ENV=production

RUN npm run build
RUN npm prune

EXPOSE 5000

CMD [ "node", "dist/main.js" ]
