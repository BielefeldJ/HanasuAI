FROM node:25-alpine

LABEL maintainer="BielefeldJ"
LABEL description="HanasuAI Docker"

ARG GIT_HASH=dev
ENV HANASU_VERSION=$GIT_HASH

WORKDIR /hanasuAI

#install dependencies 
COPY package*.json ./
RUN npm install --production

#copy bot sourcecode
COPY . .

#create volume for stats files
VOLUME /hanasuAI/stats
VOLUME /hanasuAI/config

#rename config. Needs to be mounted in docker compose!
RUN mv config/example_config.js config/config.js

CMD [ "npm", "start" ]