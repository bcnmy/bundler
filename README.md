# Relayer Node Service

## Workflow best practices

### Branching

This project has two main branches, `main`, and `dev`. Then we do work based on branches off of `dev`.

`main`: Production branch. This is code that's live for the project.  
`dev`: Staging branch. This represents what will be included in the next release.

As we work on features, we branch off of the `dev` branch: `git checkout -b feature/new-nav-bar`.

Working branches have the form `<type>/<feature>` where `type` is one of:

- feat
- fix
- hotfix
- chore
- refactor

### Commit Messages

#### Basic

`<type>(<scope>):<subject>`

Your basic commit messages should have a **type**, **scope**, and **subject**:

- _Type_ is one of the types listed above
- _Scope_ is the area of the code that the commit changes
- _Subject_ is a brief description of the work completed


## Local deployment 

### Requirements:

- Rabbitmq: https://www.rabbitmq.com/
- Centrifugo: https://github.com/centrifugal/centrifugo
- Redis: https://redis.io

For centrifugo use the following base configuration file
```
{
  "token_hmac_secret_key": "averystrongsecret",
  "admin_password": "usedIfAdminSetToTrue",
  "admin_secret": "averystrongsecretforadmin",
  "api_key": "usedforpostapi",
  "allowed_origins": ["*"],
  "debug": true,
  "admin": true,
  "log_level": "debug",
  "client_anonymous": true,
  "client_channel_limit": 512,
  "namespaces": [
    {
      "name": "relayer",
      "publish": true,
      "history_size": 10,
      "history_ttl": "300s",
      "recover": true,
      "anonymous": false
    },
    {
      "name": "transaction",
      "publish": true,
      "history_size": 10,
      "history_ttl": "300s",
      "recover": true,
      "anonymous": true
    }
  ]
}
```

## Steps to run the project

1. Clone the project

```jsx
git clone https://github.com/bcnmy/relayer-node-service.git
```

2. Checkout to development branch

```jsx
git checkout development
```

3. Install 
```jsx
yarn install
```

4. Check if config.json.enc file exists in the config folder in the root of the repository. If not or if you want to make any changes in the configuration. Create a file config.json in config folder. You can use the template shown below for local deployment or find config-example.json file in the folder.

```jsx
{
  "slack": {
    "token": "",
    "channel": "1BQKZLQ0Y"
  },
  "dataSources": {
    "mongoUrl": "mongodb://localhost:27017",
    "redisUrl": "redis://localhost:6379"
  },
  "socketService": {
    "wssUrl": "ws://localhost:9000/connection/websocket",
    "httpUrl": "http://localhost:9000/api",
    "token": "9edb7c38-0f55-4627-9bda-4cc050b5f6cb",
    "apiKey": "a4c3c3df-4294-4719-a6a6-0c3416d68466"
  },
  "queueUrl": "amqp://localhost:5672?heartbeat=30",
}
```

To update the config.json.enc file run ts-node encrypt-config.ts

5. To update configuration for chain specific parameters (provider url, currency, decimals), relayer manager, fee options, transacactions use static-config.json in the config folder.  

6. Run the following code to start the project. It supports goerli and mumbai
```jsx
yarn run dev
```
## Install bundler for the first time in a new k8s cluster
Long story short is that you need to run 
`bundler/install-bundler/bundler-initial-setup.sh`

### 1. Manual step - create `config/config.json` ;

content should look like
```
{
  "relayerManagers": [
    {
      "relayerSeed": "******",
      "ownerPublicKey": "0x******",
      "ownerPrivateKey": "0x0e1*****",
      "ownerAccountDetails": {
        "137": {
          "publicKey": "0x*****",
          "privateKey": "0x*******"
        }
      }
    }
  ]
}
```

### 2. Manual step - create `config.json.enc` at the root of the repo;<br>
this is done by running `encrypt-config.ts`; <br>
example:<br>
install `ts-node`
```bash
npm install --location=global ts-node typescript
```
create a test file in `config` dir

```bash
cat config/radu-test-config.json
'{"a": "b"}'
```
set the passphares
```bash
export CONFIG_PASSPHRASE=secret 
```
finally run `encrypt-config.ts`
```
ts-node encrypt-config.ts radu-test-config.json
```

to decrypt:
```bash
cat radu-test-config.json.enc
xPJ9gyGx7U5q+NAoKswoGM28dDYEICBRUWcczvgI7aE=422142eae514c31c05e345669e56b4e9141649c92d60f3b83ab02c22b072cf76dSsomU6+8Fb6EgIFBoSAIQ==

ts-node decrypt-config.ts radu-test-config.json.enc
'{"a": "b"}'
```

- save the password that was used `config.json.enc` ; the script will ask 
for it ;

### 3. create a config file that can be saved in this repo `install-bundler/configs`
e.g. `install-bundler/configs/bundler-tw-staging.cfg`
```
NAMESPACE="bundler-tw-staging"
PROJECT_ID="biconomy-prod"
IMAGE="us-docker.pkg.dev/biconomy-prod/bundler/trustwallet"
IMAGE_TAG="7064007"
DNS_NAME="bundler-tw-staging.biconomy.io"
IP_NAME="bundler-tw-staging"
CHAINS_CFG_FILENAME="staging-trust-wallet-chains.sh"
CONTEXT="gke_biconomy-prod_us-east1_dedicated-bundler"
```

### 4. Run `bundler-initial-setup.sh`
This will install all dependency apps required to run the bundler.
It will also create secrets in GCP Secret Manager.
```bash
./bundler-initial-setup.sh configs/bundler-tw-staging.cfg
```
Output saved in `doc/bundler-tw-staging.md`

### 5. Update GCP secret containing required configuration secret values.
By running the script in previous step you have created a secret that contains
configuration information based on this pattern. <br>
```bash
TRIMMED_CLUSTER_NAME=$(echo "$CLUSTER_NAME" | cut -c 1-8)
TRIMMED_NAMESPACE=$(echo "$NAMESPACE" | cut -c 1-10)
GCP_PLAINTEXT_CONFIG_SECRET="$TRIMMED_CLUSTER_NAME-$TRIMMED_NAMESPACE-cfg-plain"
```

Use console.cloud.google.com UI to update the values of the secret.
Content of the secret should look like:
```bash
SIMULATION_DATA_JSON=<value>
TOKEN_PRICE_JSON=<value>
SLACK_JSON=<value>
PROVIDER_JSON=<value>
DATASOURCES_JSON=<value>
SOCKET_SERVICE_JSON=<value>
QUEUE_URL=<value>
```

### 6. Add DNS record in cloudflare
The script will tell you what DNS record you need to add in cloudflare and
for which IP.

### 7. Deploy the bundler.

Dependency: `configs/bundler-tw-staging.cfg` based on `configs/example.cfg`

```bash
./bundler-update-release.sh configs/bundler-tw-staging.cfg
```

## CI/CD with Github Actions

To create the GCP workload identity service account 
  - go to https://github.com/bcnmy/devops/tree/master/gcp/github-actions
  - create new sh file `configure_bcnmy_<github_repo_name>`;
    e.g. `configure_bcnmy_bundler.sh`
  - run the new script
  - get value of service account
    e.g. `sa-bundler@prj-workload-identity-001.iam.gserviceaccount.com`


