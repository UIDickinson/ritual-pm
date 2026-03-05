FROM node:22-alpine

WORKDIR /app

COPY workers/package*.json ./
RUN npm install

COPY workers/src ./src

ENV NODE_ENV=production
CMD ["npm", "start"]
