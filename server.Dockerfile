FROM node:16.3.0-alpine

# install dependencies
RUN apk update
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python &&\
    python3 -m ensurepip &&\
    pip3 install --no-cache --upgrade pip setuptools &&\
    apk add --update make

# arguments
ARG PORT=3000

RUN mkdir -p /server
WORKDIR /server

COPY package.json yarn.lock .env ./

# install packages
RUN yarn install
COPY . /server 

RUN yarn run build:server
EXPOSE 3000

CMD ["yarn", "run", "start:server"]
