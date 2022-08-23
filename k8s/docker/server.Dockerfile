FROM node:16.3.0-alpine

# install dependencies
RUN apk update

# arguments
ARG PORT=3000

RUN mkdir -p /server
WORKDIR /server

COPY package.json yarn.lock  ./

# install packages
RUN yarn install
COPY . /server 

RUN yarn run build:server
EXPOSE 3000

CMD ["yarn", "run", "start:server"]
