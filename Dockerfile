FROM node:20

RUN npm install -g ts-node typescript

WORKDIR /app