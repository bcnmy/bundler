Render helm template locally

```bash

helm upgrade staging-sdk-relayer-0 ./k8s/relayer/ --install -f ./k8s/relayer/values.staging.yaml --set-string namespace=sdk-staging -n sdk-staging --dry-run
```