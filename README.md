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

Manual steps:
- create `config.json`
- create `config.json.enc` at the root of the repo.
- have the password that was used `config.json.enc` handy; the script will ask 
for it
- run the script

```bash
./bundler-initial-setup.sh configs/bundler-tw-staging.cfg
```

<details>
 <summary>./bundler-initial-setup.sh configs/bundler-tw-staging.cfg</summary>

```
Current cluster name is: dedicated-bundler
Current trimmed cluster name is: dedicate
This script must be run only once for a new bundler deployment in the namespace
Context matches. Continuing...
Global IP with name bundler-tw-staging already exists.
 The IP address for bundler-tw-staging is: 34.110.199.133
 Make sure you have added an A record against bundler-tw-staging.biconomy.io with 34.110.199.133
NAME                 STATUS   AGE
bundler-tw-staging   Active   32h
 SUCCESS: bundler-tw-staging exists GCP Secret dedicate-bundler-tw-config doesn't exist.
Creating it now from /Users/radupopa/p/bico/bundler/config.json.enc
Created version [1] of the secret [dedicate-bundler-tw-config].
Secret dedicate-bundler-tw-config has been created.
GCP_ENCRYPTED_CONFIG_SECRET dedicate-bundler-tw-config process completed.
Secret dedicate-bundler-tw-passphrase does not exist.
Enter the password:
Created version [1] of the secret [dedicate-bundler-tw-passphrase].
Secret dedicate-bundler-tw-passphrase created successfully.
Creting GCP IAM role/service [dedicate-bundler-tw-bund] account
Created service account [dedicate-bundler-tw-bund].
Creation of GCP IAM role/service [dedicate-bundler-tw-bund] account completed
Adding role binding of GCP IAM role/service [dedicate-bundler-tw-bund] to GCP_ENCRYPTED_CONFIG_SECRET=[dedicate-bundler-tw-config]
Updated IAM policy for secret [dedicate-bundler-tw-config].
bindings:
- members:
  - serviceAccount:dedicate-bundler-tw-bund@biconomy-prod.iam.gserviceaccount.com
  role: roles/secretmanager.secretAccessor
etag: BwYPY_iWdus=
version: 1
Role binding of GCP IAM role/service [dedicate-bundler-tw-bund] to GCP_ENCRYPTED_CONFIG_SECRET=[dedicate-bundler-tw-config] completed
Adding role binding of GCP IAM role/service [dedicate-bundler-tw-bund] to SECRET_NAME=[dedicate-bundler-tw-passphrase]
Updated IAM policy for secret [dedicate-bundler-tw-passphrase].
bindings:
- members:
  - serviceAccount:dedicate-bundler-tw-bund@biconomy-prod.iam.gserviceaccount.com
  role: roles/secretmanager.secretAccessor
etag: BwYPY_i1I7k=
version: 1
Role binding of GCP IAM role/service [dedicate-bundler-tw-bund] to SECRET_NAME=[dedicate-bundler-tw-passphrase] completed
Creating dedicate-bundler-tw--sa in bundler-tw-staging
serviceaccount/dedicate-bundler-tw--sa created
dedicate-bundler-tw--sa in bundler-tw-staging created
Binding dedicate-bundler-tw-bund with kubernetes dedicate-bundler-tw--sa for workloadIdentityUser in bundler-tw-staging
Updated IAM policy for serviceAccount [dedicate-bundler-tw-bund@biconomy-prod.iam.gserviceaccount.com].
bindings:
- members:
  - serviceAccount:biconomy-prod.svc.id.goog[bundler-tw-staging/dedicate-bundler-tw--sa]
  role: roles/iam.workloadIdentityUser
etag: BwYPY_kR-wE=
version: 1
Binding Complete
Annotating dedicate-bundler-tw-bund with kubernetes dedicate-bundler-tw--sa for workloadIdentityUser in bundler-tw-staging
serviceaccount/dedicate-bundler-tw--sa annotate
Annotation Complete

------ Deploying redis to bundler-tw-staging -----
Release "redis" does not exist. Installing it now.
W0120 19:32:11.665549   31221 warnings.go:70] autopilot-default-resources-mutator:Autopilot updated StatefulSet bundler-tw-staging/redis-replicas: adjusted resources to meet requirements for containers [redis] (see http://g.co/gke/autopilot-resources)
W0120 19:32:11.665557   31221 warnings.go:70] autopilot-default-resources-mutator:Autopilot updated StatefulSet bundler-tw-staging/redis-master: adjusted resources to meet requirements for containers [redis] (see http://g.co/gke/autopilot-resources)
NAME: redis
LAST DEPLOYED: Sat Jan 20 19:32:01 2024
NAMESPACE: bundler-tw-staging
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: redis
CHART VERSION: 18.1.2
APP VERSION: 7.2.1

** Please be patient while the chart is being deployed **

Redis&reg; can be accessed on the following DNS names from within your cluster:

    redis-master.bundler-tw-staging.svc.cluster.local for read/write operations (port 6379)
    redis-replicas.bundler-tw-staging.svc.cluster.local for read-only operations (port 6379)



To get your password run:

    export REDIS_PASSWORD=$(kubectl get secret --namespace bundler-tw-staging redis -o jsonpath="{.data.redis-password}" | base64 -d)

To connect to your Redis&reg; server:

1. Run a Redis&reg; pod that you can use as a client:

   kubectl run --namespace bundler-tw-staging redis-client --restart='Never'  --env REDIS_PASSWORD=$REDIS_PASSWORD  --image docker.io/bitnami/redis:7.2.1-debian-11-r0 --command -- sleep infinity

   Use the following command to attach to the pod:

   kubectl exec --tty -i redis-client \
   --namespace bundler-tw-staging -- bash

2. Connect using the Redis&reg; CLI:
   REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h redis-master
   REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h redis-replicas

To connect to your database from outside the cluster execute the following commands:

    kubectl port-forward --namespace bundler-tw-staging svc/redis-master 6379:6379 &
    REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h 127.0.0.1 -p 6379
Mongo deployment completed
Redis url \033[0;32m<<redis://:IAMredis985834@redis.bundler-tw-staging.svc.cluster.local:6379>>\033[0m
To debug Redis, you can use the following commands:
#kubectl run redis-debug --rm -i --tty --image redis:latest -- bash
If you want to benchmark your redis installation
redis-benchmark -h 127.0.0.1 -p <redis_port> -c 100 -n 100000 -a <redis_password>
#redis-cli -h redis-master.bundler-tw-staging.svc.cluster.local -a IAMredis985834

 ####### Deploying  rabbitmq to bundler-tw-staging #######
Release "rabbitmq" does not exist. Installing it now.
W0120 19:34:02.986382   31666 warnings.go:70] autopilot-default-resources-mutator:Autopilot updated StatefulSet bundler-tw-staging/rabbitmq: adjusted resources to meet requirements for containers [rabbitmq] (see http://g.co/gke/autopilot-resources)
NAME: rabbitmq
LAST DEPLOYED: Sat Jan 20 19:33:50 2024
NAMESPACE: bundler-tw-staging
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: rabbitmq
CHART VERSION: 12.3.0
APP VERSION: 3.12.7** Please be patient while the chart is being deployed **

Credentials:
    echo "Username      : RMQUsername"
    echo "Password      : $(kubectl get secret --namespace bundler-tw-staging rabbitmq -o jsonpath="{.data.rabbitmq-password}" | base64 -d)"
    echo "ErLang Cookie : $(kubectl get secret --namespace bundler-tw-staging rabbitmq -o jsonpath="{.data.rabbitmq-erlang-cookie}" | base64 -d)"

Note that the credentials are saved in persistent volume claims and will not be changed upon upgrade or reinstallation unless the persistent volume claim has been deleted. If this is not the first installation of this chart, the credentials may not be valid.
This is applicable when no passwords are set and therefore the random password is autogenerated. In case of using a fixed password, you should specify it when upgrading.
More information about the credentials may be found at https://docs.bitnami.com/general/how-to/troubleshoot-helm-chart-issues/#credential-errors-while-upgrading-chart-releases.

RabbitMQ can be accessed within the cluster on port 5672 at rabbitmq.bundler-tw-staging.svc.cluster.local

To access for outside the cluster, perform the following steps:

To Access the RabbitMQ AMQP port:

    echo "URL : amqp://127.0.0.1:5672/"
    kubectl port-forward --namespace bundler-tw-staging svc/rabbitmq 5672:5672

To Access the RabbitMQ Management interface:

    echo "URL : http://127.0.0.1:15672/"
    kubectl port-forward --namespace bundler-tw-staging svc/rabbitmq 15672:15672

To access the RabbitMQ Prometheus metrics, get the RabbitMQ Prometheus URL by running:

    kubectl port-forward --namespace bundler-tw-staging svc/rabbitmq 9419:9419 &
    echo "Prometheus Metrics URL: http://127.0.0.1:9419/metrics"

Then, open the obtained URL in a browser.
[RABBITMQ] deployement completedTo connect to the rabitMQ
To test connections
kubectl run curl-test --namespace bundler-tw-staging --image=busybox --rm -it -- /bin/sh
curl -i -u RMQUsername:RMQpassword http://rabbitmq.testing.svc.cluster.local:15672/api/overview

------ Deploying mongo to bundler-tw-staging -----
Release "mongo" does not exist. Installing it now.
W0120 19:39:08.696250   31721 warnings.go:70] autopilot-default-resources-mutator:Autopilot updated Deployment bundler-tw-staging/mongo: defaulted unspecified resources for containers [metrics] (see http://g.co/gke/autopilot-defaults), and adjusted resources to meet requirements for containers [mongodb] (see http://g.co/gke/autopilot-resources)
NAME: mongo
LAST DEPLOYED: Sat Jan 20 19:38:58 2024
NAMESPACE: bundler-tw-staging
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: mongodb
CHART VERSION: 13.18.4
APP VERSION: 6.0.10

** Please be patient while the chart is being deployed **

MongoDB&reg; can be accessed on the following DNS name(s) and ports from within your cluster:

    mongo.bundler-tw-staging.svc.cluster.local

To get the root password run:

    export MONGODB_ROOT_PASSWORD=$(kubectl get secret --namespace bundler-tw-staging mongo -o jsonpath="{.data.mongodb-root-password}" | base64 -d)

To get the password for "userone" run:

    export MONGODB_PASSWORD=$(kubectl get secret --namespace bundler-tw-staging mongo -o jsonpath="{.data.mongodb-passwords}" | base64 -d | awk -F',' '{print $1}')

To get the password for "usertwo" run:

    export MONGODB_PASSWORD=$(kubectl get secret --namespace bundler-tw-staging mongo -o jsonpath="{.data.mongodb-passwords}" | base64 -d | awk -F',' '{print $2}')

To connect to your database, create a MongoDB&reg; client container:

    kubectl run --namespace bundler-tw-staging mongo-client --rm --tty -i --restart='Never' --env="MONGODB_ROOT_PASSWORD=$MONGODB_ROOT_PASSWORD" --image docker.io/zcube/bitnami-compat-mongodb:latest --command -- bash

Then, run the following command:
    mongosh admin --host "mongo" --authenticationDatabase admin -u $MONGODB_ROOT_USER -p $MONGODB_ROOT_PASSWORD

To connect to your database from outside the cluster execute the following commands:

    kubectl port-forward --namespace bundler-tw-staging svc/mongo 27017:27017 &
    mongosh --host 127.0.0.1 --authenticationDatabase admin -p $MONGODB_ROOT_PASSWORD

To access the MongoDB&reg; Prometheus metrics, get the MongoDB&reg; Prometheus URL by running:

    kubectl port-forward --namespace bundler-tw-staging svc/mongo-metrics 9216:9216 &
    echo "Prometheus Metrics URL: http://127.0.0.1:9216/metrics"

Then, open the obtained URL in a browser.
Mongo deployment completed
To connect to the databases, use the following URLs:
Paymaster dashboard DB URL:
mongodb://usertwo:usertwopassword@mongo.bundler-tw-staging.svc.cluster.local:27017/paymaster-dashboard

RelayerNode DB URL:
mongodb://userone:useronepassword@mongo.bundler-tw-staging.svc.cluster.local:27017/relayer-node-service

To test connections
kubectl run -i --tty --rm debugmongo --image=mongo --restart=Never --namespace=bundler-tw-staging -- bash
mongosh mongodb://mongo.bundler-tw-staging.svc.cluster.local:27017/relayer-node-service -u userone -p useronepassword

####### Deploying centrifugo to bundler-tw-staging  #######
Release "centrifugo" does not exist. Installing it now.
W0120 19:41:09.094580   31734 warnings.go:70] autopilot-default-resources-mutator:Autopilot updated Deployment bundler-tw-staging/centrifugo: adjusted resources to meet requirements for containers [centrifugo] (see http://g.co/gke/autopilot-resources)
NAME: centrifugo
LAST DEPLOYED: Sat Jan 20 19:41:02 2024
NAMESPACE: bundler-tw-staging
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
1. Get the application URL by running these commands:
  export POD_NAME=$(kubectl get pods --namespace bundler-tw-staging -l "app.kubernetes.io/name=centrifugo,app.kubernetes.io/instance=centrifugo" -o jsonpath="{.items[0].metadata.name}")
  kubectl --namespace bundler-tw-staging port-forward $POD_NAME 8000:8000


 ####### Deployed centrifugo to bundler-tw-staging #######

staging-trust-wallet-chains.sh
bundler-tw-staging.biconomy.io
staging-trust-wallet-chains.sh
/Users/radupopa/p/bico/bundler/install-bundler
/Users/radupopa/p/bico/bundler/install-bundler/configs/chains/staging-trust-wallet-chains.sh
Chains that are being added to Ingress 80001
{80001}
IP_NAME that will be attached to Ingress is bundler-tw-staging
Release "network" does not exist. Installing it now.
W0120 19:41:30.901571   31746 warnings.go:70] annotation "kubernetes.io/ingress.class" is deprecated, please use 'spec.ingressClassName' instead
NAME: network
LAST DEPLOYED: Sat Jan 20 19:41:25 2024
NAMESPACE: bundler-tw-staging
STATUS: deployed
REVISION: 1
TEST SUITE: None
####### Deployed network to bundler-tw-staging #######
```
</details>

## CI/CD with Github Actions

To create the GCP workload identity service account 
  - go to https://github.com/bcnmy/devops/tree/master/gcp/github-actions
  - create new sh file `configure_bcnmy_<github_repo_name>`;
    e.g. `configure_bcnmy_bundler.sh`
  - run the new script
  - get value of service account
    e.g. `sa-bundler@prj-workload-identity-001.iam.gserviceaccount.com`


