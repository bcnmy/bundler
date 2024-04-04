#!/bin/bash
set -e

#A clauster should have only one prometheus
NAMESPACE="monitoring"
HELM_RELEASE="prometheus"


# if ! kubectl get namespace $NAMESPACE &>/dev/null; then
#   printf "$NAMESPACE doesnt exists, aborting ...\n"
#   exit
# fi
printf "\n${GREEN} ####### Deploying Prometheus $HELM_RELEASE to $NAMESPACE ${NC} ####### \n";
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

helm upgrade --install  --wait --timeout 720s $HELM_RELEASE $DIR/prometheus/ \
  -n  $NAMESPACE \
  -f $DIR/prometheus/values.yaml \
  --set nameOverride=$HELM_RELEASE \
  --set alertmanager.enabled=false \
  --set kube-state-metrics.enabled=true \
  --set prometheus-node-exporter.enabled=false \
  --set prometheus-pushgateway.enabled=false
printf "Promethus deployment completed";