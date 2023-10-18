FROM node:18.17.1-bookworm

# install dependencies
# arguments
ARG PORT=3000

WORKDIR /relayer-node

COPY package.json yarn.lock  ./

# install packages
RUN yarn install
COPY . /relayer-node 

RUN yarn run build
EXPOSE 3000
ENV NODE_OPTIONS==--max_old_space_size=6000

CMD ["yarn", "run", "start"]
