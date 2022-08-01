FROM node:16.3.0-alpine

# install dependencies
RUN apk update && apk add git openssl openssh

# arguments
ARG SSH_PRIV_KEY
ARG SSH_PUB_KEY
ARG PORT=3000

RUN mkdir -p /root/.ssh && chmod 0700 /root/.ssh && ssh-keyscan github.com > /root/.ssh/known_hosts
RUN echo "$SSH_PRIV_KEY" > /root/.ssh/id_rsa && \
    echo "$SSH_PUB_KEY" > /root/.ssh/id_rsa.pub && \
    chmod 600 /root/.ssh/id_rsa && \
    chmod 600 /root/.ssh/id_rsa.pub

RUN mkdir -p /app
WORKDIR /app

COPY package.json yarn.lock ./

# install packages
RUN yarn install
COPY . /app 

# generate openssl cert
RUN openssl req -nodes -new -subj  "/C=/ST=/O=/CN=" -x509 -keyout server.key -out server.cert

RUN yarn run build
EXPOSE 3000

CMD ["yarn", "run", "start"]
