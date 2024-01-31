#!/bin/bash
set -e

NAMESPACE=$1
REPLICA_COUNT=$2
# Check if the required arguments are passed
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <NAMESPACE> <REPLICA_COUNT> for RabbitMQ"
    exit 1
fi

HELM_RELEASE="rabbitmq"

export HELM_EXPERIMENTAL_OCI=1

printf "\n${GREEN} ####### Deploying  $HELM_RELEASE to $NAMESPACE ${NC}####### \n";
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

helm  upgrade --install  --wait --timeout 720s $HELM_RELEASE "$DIR/rabbitmq/" \
  -f "$DIR/rabbitmq/values.yaml" \
  -f "$DIR/custom-values.yaml" \
  -n  "$NAMESPACE" \
  --set auth.username=RMQUsername \
  --set auth.password=RMQpassword \
  --set auth.erlangCookie=secretcookie \
  --set persistence.storageClass="" \
  --set metrics.enabled=true \
  --set metrics.serviceMonitor.enabled=false \
  --set replicaCount="$REPLICA_COUNT" \
  --set clustering.rebalance=true \
  --set clustering.forceBoot=true \
  --set nameOverride=$HELM_RELEASE
printf "[RABBITMQ] deployement completed";
echo "To connect to the rabitMQ"
echo "To test connections"
echo "kubectl run curl-test --namespace $NAMESPACE --image=busybox --rm -it -- /bin/sh "
echo "curl -i -u RMQUsername:RMQpassword http://rabbitmq.testing.svc.cluster.local:15672/api/overview"