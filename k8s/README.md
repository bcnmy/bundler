Render helm template locally, staging

```bash
helm upgrade staging-sdk-relayer-0 ./k8s/relayer/ \
     --install \
     --values ./k8s/relayer/values.staging.yaml \
     --set-string namespace=sdk-staging \
     --namespace sdk-staging \
     --set index=0  \
     --wait \
     --timeout 300s \
     --atomic \
     --dry-run

# common
HELM_NAME="staging-sdk-relayer-common"
NAMESPACE="sdk-staging"
ENV=staging

helm upgrade "${HELM_NAME}" ./k8s/common/    \
     --install \
     --wait \
     --timeout 720s \
     --values ./k8s/common/values."${ENV}".yaml \
     --set-string namespace="${NAMESPACE}" \
     --namespace "${NAMESPACE}" \
     --atomic \
     --dry-run
```


Render template in prod 
Make sure to use an index like 0 or 1, etc
```bash
helm upgrade prod-sdk-relayer-1 ./k8s/relayer/ \
     --install \
     --values ./k8s/relayer/values.prod.yaml \
     --set-string namespace=sdk-prod \
     --namespace sdk-prod  \
     --set index=1  \
     --wait \
     --timeout 300 \
     --atomic \
     --dry-run
```

Local install staging 

```bash
# from root of git repo
# one stateful set instace
./k8s/deploy.sh 1 staging staging-sdk-relayer sdk-staging
# two stateful set instace
./k8s/deploy.sh 2 staging staging-sdk-relayer sdk-staging
```
