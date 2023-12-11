FROM node:18.17.1-bookworm

# install dependencies
# RUN apk update

# arguments
ARG PORT=3000

RUN mkdir -p /relayer-node
WORKDIR /relayer-node

COPY package.json yarn.lock  ./

# install packages
RUN yarn install
COPY . /relayer-node

RUN yarn run build
EXPOSE 3000

CMD ["yarn", "run", "start"]
