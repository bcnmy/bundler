FROM node:21.6-bookworm as builder

# Install dependencies

# arguments
ARG PORT=3000

# Set up the directory
WORKDIR /bundler

# Copy package files
COPY package.json yarn.lock  ./

# install packages
RUN yarn install

# Copy the rest of the files
COPY . /relayer-node

# Build the application
RUN yarn run build

# Second stage
FROM node:21.6-bookworm

# Tini allows us to avoid several Docker edge cases, see https://github.com/krallin/tini.
# NOTE: See https://github.com/hexops/dockerfile#is-tini-still-required-in-2020-i-thought-docker-added-it-natively

RUN apt-get update && apt-get install -y \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Expose the port
EXPOSE 3000

# Non-root user for security purposes.
#
# UIDs below 10,000 are a security risk, as a container breakout could result
# in the container being ran as a more privileged user on the host kernel with
# the same UID.
#
# Static GID/UID is also useful for chown'ing files outside the container where
# such a user does not exist.
RUN addgroup --gid 10001 --system nonroot \
  && adduser  --uid 10000 --system --ingroup nonroot --home /home/nonroot nonroot

WORKDIR /home/nonroot/bundler
COPY --from=builder --chown=10000:10001 /bundler /home/nonroot/bundler


# Use the non-root user to run our application
USER nonroot

ENTRYPOINT ["/usr/bin/tini", "--", "yarn"]

# Default arguments for your app (remove if you have none):
CMD ["run", "start"]
