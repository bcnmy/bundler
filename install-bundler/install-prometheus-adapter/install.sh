
RED='\033[0;31m'
NC='\033[0m'
GREEN='\033[0;32m'
SECONDS=0
ENV=$1
NAMESPACE=$2
CHAINS_CFG_FILENAME=$3
# shift 5
# CHAINS=("$@")

HELM_RELEASE="monitoring-adapter";

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PARENT_DIR="$(dirname "$DIR")"


source "$PARENT_DIR/configs/chains/$CHAINS_CFG_FILENAME"

array_names=$(declare -p | grep -Eo 'chain_[a-zA-Z0-9_]+')

# Iterate over these names and extract the chainId values
declare -a CHAIN_IDS
for array_name in $array_names; do
    eval "chain_id=\${$array_name[chainId]}"
    CHAIN_IDS+=("$chain_id")
done

echo "${CHAIN_IDS[@]}"
sh "$DIR/custom-values.sh" "${CHAIN_IDS[@]}" > "$DIR/custom-rules.yaml"

echo -e  "\n${GREEN} ####### Deploying Prometheus adopter $HELM_RELEASE to $NAMESPACE ${NC} ####### \n";

PROMETHEUS_URL="http://prometheus-server.monitoring.svc.cluster.local"

echo -e  "\n${RED} The Prometheus adapter PROMETHEUS URL=<<$PROMETHEUS_URL>> \
  according to format <<http://prometheus-server.monitoring.svc.cluster.local>>, Please change it if required ${NC}\n";

# Prompt user for confirmation
read -p "Is the PROMETHEUS URL correct? (y/n) " -n 1 -r

helm upgrade --install  --wait --timeout 120s $HELM_RELEASE "$DIR/prometheus-adapter/" \
  -n  "$NAMESPACE" \
  -f "$DIR/prometheus-adapter/values.yaml" \
  -f "$DIR/custom-rules.yaml" \
    --set nameOverride=$HELM_RELEASE \
  --set prometheus.url=$PROMETHEUS_URL \
  --set prometheus.port=80 \
  --set replicas=2

echo -e  "Prometheus-adapter Deployment completed in $SECONDS";

## {rpc_method="eth_sendUserOperation", app="chain-137", code="200"}