# Bundler

Biconomy ERC-4337 bundler-as-a-service implementation.

## Workflow best practices

This project has two _important_ branches:

- `master`: Production branch. This is code that's currently in production.
- `staging`: Staging branch. This represents what will be deployed to staging and included in the next release after it's been tested.

To write quality commit messages we (try to) follow the [Conventional Commits Standard](https://www.conventionalcommits.org/en/v1.0.0/).

## Local Development Environment

There are 2 ways to run the service and it's dependencies locally:

1. **Manually**: follow the instructions in the [Bundler Local Setup](https://www.notion.so/biconomy/Local-setup-858695240f3a4c19b6c96cbb3f235b0a?pvs=4) Notion page.
2. **Docker (recommended)**: follow the instructions below.

## Using the Docker development environment
1. Install Docker, Docker compose and `ts-node` on your local machine
2. Follow the [First setup instructions](src/config/CONFIG.md#👶🏻-first-setup-instructions) to configure the Bundler before running it.
3. Run `docker compose up` and the server and all of it's dependencies should run in the current terminal session without throwing any errors.

Other useful commands:

- `docker compose down`: stop the containers without deleting their data.
- `docker compose down -v` tears down the whole environment, killing the containers and deleting any data volumes permanently. ⚠️ This will delete the local DB, do it only if you don't care about the data.
- `docker compose up -d`: runs the containers in the background without blocking the current terminal sessions.
- 💡 `docker compose build server`: run this whenever you add a new package to `package.json` or it won't be reflected in the container.
- `docker compose build --no-cache <service_name>`: build without cache if you suspect caching problems.


### NOTES for DEVOPS
When adding a new chain integration make sure to add the new charin id
to all relevant config deployment files, in the `supportedNetworks`
e.g. `config/staging.json` or the bunlder will not start that network
even thouh is supported.
