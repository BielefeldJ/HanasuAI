FROM node:18-alpine

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
#create dummy config. Needs to be mounted in docker compose!
RUN touch config.js

CMD [ "npm", "start" ]