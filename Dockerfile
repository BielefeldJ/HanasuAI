FROM node:18-alpine

LABEL maintainer="BielefeldJ"
LABEL description="HanasuAI Docker"

WORKDIR /hanasuAI

RUN mkdir node_modules
COPY ./bufferutil /hanasuAI/node_modules/bufferutil

#install dependencies 
COPY package*.json ./
RUN npm install

#copy bot sourcecode
COPY . .

#create volume for stats files
VOLUME /hanasuAI/stats
#create dummy config. Needs to be mounted in docker compose!
RUN touch config.js

CMD [ "npm", "start" ]