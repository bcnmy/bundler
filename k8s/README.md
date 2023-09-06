Render helm template locally, staging

```bash

helm upgrade staging-sdk-relayer-0 ./k8s/relayer/ \
     --install \
     --values ./k8s/relayer/values.staging.yaml \
     --set-string namespace=sdk-staging \
     --namespace sdk-staging \
     --set index=0  \
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
     --dry-run
```
