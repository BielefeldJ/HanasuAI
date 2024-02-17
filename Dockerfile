FROM node:21-alpine

LABEL maintainer="BielefeldJ"
LABEL description="HanasuAI Docker"

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