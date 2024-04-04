#!/bin/bash
set -e

NAMESPACE=$1
REPLICA_COUNT=$2
# Check if the required arguments are passed
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <NAMESPACE> <REPLICA_COUNT> for centrifugo"
    exit 1
fi

HELM_RELEASE="centrifugo";

# shellcheck disable=SC2059
printf "\n${GREEN}####### Deploying $HELM_RELEASE to $NAMESPACE ${NC} ####### \n";
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

helm upgrade --install  --wait --timeout 720s $HELM_RELEASE "$DIR/centrifugo/." \
  --values "${DIR}/centrifugo/values.yaml"  \
  --namespace "${NAMESPACE}" \
  --set nameOverride="${HELM_RELEASE}" \
  --set replicaCount="${REPLICA_COUNT}" \
  --set secrets.tokenHmacSecretKey=averystrongsecret \
  --set secrets.adminPassword=usedIfAdminSetToTrue \
  --set secrets.adminSecret=averystrongsecretforadmin \
  --set secrets.apiKey=usedforpostapi \
  --set config.admin=true \
  --set config.debug=true \
  --set config.log_level=debug \
  --set config.client_anonymous=true \
  --set config.client_channel_limit=512 \
  --set config.namespaces[0].name=relayer \
  --set config.namespaces[0].publish=true \
  --set config.namespaces[0].history_size=10 \
  --set config.namespaces[0].history_ttl=300s \
  --set config.namespaces[0].recover=true \
  --set config.namespaces[0].anonymous=false \
  --set config.namespaces[1].name=transaction \
  --set config.namespaces[1].publish=true \
  --set config.namespaces[1].history_size=10 \
  --set config.namespaces[1].history_ttl=300s \
  --set config.namespaces[1].recover=true \
  --set config.namespaces[1].anonymous=true \
  --set metrics.enabled=true

# shellcheck disable=SC2028
echo "\n\n ####### Deployed $HELM_RELEASE to $NAMESPACE ####### \n";