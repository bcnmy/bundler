Render helm template locally

```bash

helm upgrade staging-sdk-relayer-0 ./k8s/relayer/ --install -f ./k8s/relayer/values.staging.yaml --set-string namespace=sdk-staging -n sdk-staging --dry-run
```

Render template in prod 
Make sure to use an index like 0 or 1, etc
```bash
helm upgrade prod-sdk-relayer-1 ./k8s/relayer/ \
     --install \
     -f ./k8s/relayer/values.prod.yaml \
     --set-string namespace=sdk-prod \
     -n sdk-prod  \
     --set index=1  \
     --dry-run
```