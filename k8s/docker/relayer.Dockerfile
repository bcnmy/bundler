FROM node:16.3.0-alpine

# install dependencies
RUN apk update

RUN mkdir -p /relayer
WORKDIR /relayer

COPY package.json yarn.lock  ./

# install packages
RUN yarn install
COPY . /relayer 

RUN yarn run build:relayer

CMD ["yarn", "run", "start:relayer"]
