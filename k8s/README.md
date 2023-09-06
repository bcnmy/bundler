Render helm template locally

```bash
helm upgrade staging-sdk-relayer-0 ./k8s/relayer/ \
     --install \
     --values ./k8s/relayer/values.staging.yaml \
     --set-string namespace=sdk-staging \
     --namespace sdk-staging \
     --dry-run
```

# Run deploy.sh
```bash
REPLICAS=2
ENV=staging
HELM_NAME=staging-sdk-relayer
NAMESPACE=sdk-staging

./k8s/deploy.sh "${REPLICAS}" "${ENV}" "${HELM_NAME}" "${NAMESPACE}"
# ./k8s/deploy.sh 2 staging staging-sdk-relayer sdk-staging
```

# Run helm for one app instance
```bash
ENV=staging
HELM_NAME=staging-sdk-relayer
NAMESPACE=sdk-staging

helm upgrade "${HELM_NAME}" ./k8s/relayer/ \
     --install \
     --wait \
     --timeout 720s \
     --values ./k8s/relayer/values."${ENV}".yaml \
     --set-string namespace="${NAMESPACE}" \
     --set index="0" \
     --namespace "${NAMESPACE}"
```