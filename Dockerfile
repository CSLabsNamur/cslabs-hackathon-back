FROM node:20.9.0-alpine as base

# Create app directory
WORKDIR /usr/src/app

COPY package*.json .
RUN npm install

FROM base as build

WORKDIR /usr/src/app

COPY --from=base /usr/src/app /usr/src/app
COPY . .

RUN npm run build
RUN npm prune

EXPOSE 5000

ENV NODE_ENV=production

CMD [ "npm", "run", "start:prod" ]
