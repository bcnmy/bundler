FROM node:16.3.0-alpine

# install dependencies
RUN apk update
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python &&\
    python3 -m ensurepip &&\
    pip3 install --no-cache --upgrade pip setuptools &&\
    apk add --update make

RUN mkdir -p /relayer
WORKDIR /relayer

COPY package.json yarn.lock .env ./

# install packages
RUN yarn install
COPY . /relayer 

RUN yarn run build:relayer

CMD ["yarn", "run", "start:relayer"]
