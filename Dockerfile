FROM node:18-alpine

LABEL maintainer="BielefeldJ"
LABEL description="HanasuAI Docker"

WORKDIR /hanasuAI

# Copy pre build bufferutil to node_modules (needed by ibm-watson).
# This is needed for the arm/64 container.
# For some reason, npm install fails at this package on arm/64.
# If you don't wanna use the precompiled module
# you could add build software (make gcc and all that stuff) to the image
# so that npm install can compile bufferutil inside the container.
# If you are using a non ARM CPU, you can just remove the next 2 lines. 
RUN mkdir node_modules
COPY ./prebuild_modules/bufferutil /hanasuAI/node_modules/bufferutil
#utf-8-validate now has the same problem......
#So gonna do the copy trick here as well.
COPY ./prebuild_modules/utf-8-validate /hanasuAI/node_modules/utf-8-validate

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