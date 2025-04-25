# Bundler
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Biconomy ERC-4337 bundler-as-a-service implementation.

## Workflow best practices

- `master`: Production branch. This is code that's currently in production.

To write quality commit messages we follow the [Conventional Commits Standard](https://www.conventionalcommits.org/en/v1.0.0/).

To commit use `yarn commit`.

## Local Development Environment

1. Install Docker, Docker compose and `ts-node` on your local machine
2. Follow the [First setup instructions](src/config/CONFIG.md#👶🏻-first-setup-instructions) to configure the Bundler before running it.
3. (optional) Add `docker-compose.override.yaml` for Apple Silicon compatibility:
    ```yaml
    services:
      bundler:
        platform: linux/arm64/v8
      redis:
        platform: linux/arm64/v8
      mongo:
        # see: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-community-with-docker/#about-this-task
        image: mongo:4.4
        platform: linux/arm64/v8
      rabbitmq:
        platform: linux/arm64/v8
    ```
4. Run `docker compose up` and the server and all of it's dependencies should run in the current terminal session without throwing any errors.

Other useful commands:

- `docker compose down`: stop the containers without deleting their data.
- `docker compose down -v` tears down the whole environment, killing the containers and deleting any data volumes permanently. ⚠️ This will delete the local DB, do it only if you don't care about the data.
- `docker compose up -d`: runs the containers in the background without blocking the current terminal sessions.
- 💡 `docker compose build server`: run this whenever you add a new package to `package.json` or it won't be reflected in the container.
- `docker compose build --no-cache <service_name>`: build without cache if you suspect caching problems.

## Troubleshooting

### ESLint is not working in VS Code
- Make sure your Microsoft ESLint extension is the latest version
- In your VS Code settings make sure `ESLint: Use Flat Config` is enabled
