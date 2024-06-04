#!/bin/bash
set -e
RED='\033[0;31m'
NC='\033[0m'
GREEN='\033[0;32m'
ENV=$1
NAMESPACE=$2
HOST=localhost
HELM_RELEASE="$NAMESPACE-$ENV-grafana"

# Check if the required arguments are passed
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <ENV> <NAMESPACE> for grafana"
    exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Directory of grafana $DIR"

export PROMETHEUS_URL=http://$NAMESPACE-$ENV-monitoring-prometheus-server
envsubst < $DIR/datasources.yaml > $DIR/custom-values.yaml

printf "\n${GREEN} ####### Deploying GRAFANA $HELM_RELEASE to $NAMESPACE ${NC} #######";
printf "\n${RED} The grafana datasource PROMETHEUS URL=<<$PROMETHEUS_URL>> \
  according to format <<http://NAMESPACE-ENV-monitoring-prometheus-server>>, Please change it if required ${NC}\n";

# Prompt user for confirmation
read -p "Is the PROMETHEUS URL correct? (y/n) " -n 1 -r
echo # move to a new line

if [[ $REPLY =~ ^[Nn]$ ]]
then
    read -p "Please enter the correct PROMETHEUS URL: " PROMETHEUS_URL
    printf "Updated PROMETHEUS URL: $PROMETHEUS_URL"
fi

helm upgrade --install  --wait --timeout 120s $HELM_RELEASE $DIR/grafana/ \
  -n  $NAMESPACE \
  --set provider=local \
  -f $DIR/grafana/values.yaml \
  -f $DIR/custom-values.yaml \
  --set adminUser=admin \
  --set host=$HOST \
  --set adminPassword=password \
  --set-file dashboards.default.cluster-monitoring.json=$DIR/kube-cluster-monitoring.json \
  --set-file dashboards.default.node-exporter.json=$DIR/node-exporter-full.json \
  --set-file dashboards.default.node-exporter.json=$DIR/main.json

printf "GRAFANA deployement completed";

#grafana.ini:
#  server:
#    root_url: http://{{.Values.host}}/grafana