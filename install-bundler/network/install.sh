set -e

NAMESPACE=$1
DNS_NAME=$2
IP_NAME=$3
CHAINS_CFG_FILENAME=$4
# shift 5
# CHAINS=("$@")

HELM_RELEASE="network";

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PARENT_DIR="$(dirname "$DIR")"

echo "$DNS_NAME"
echo "$CHAINS_CFG_FILENAME"
echo "$PARENT_DIR"


echo "$PARENT_DIR/configs/chains/$CHAINS_CFG_FILENAME"
source "$PARENT_DIR/configs/chains/$CHAINS_CFG_FILENAME"
array_names=$(declare -p | grep -Eo 'chain_[a-zA-Z0-9_]+')

# Iterate over these names and extract the chainId values
declare -a CHAIN_IDS
for array_name in $array_names; do
    eval "chain_id=\${$array_name[chainId]}"
    CHAIN_IDS+=("$chain_id")
done
echo "Chains that are being added to Ingress ${CHAIN_IDS[*]}"


CHAINS_STR="{$(echo "${CHAIN_IDS[@]}" | tr ' ' ',')}"


echo "$CHAINS_STR"
echo "IP_NAME that will be attached to Ingress is ${IP_NAME}"
helm upgrade --install --wait --timeout 720s $HELM_RELEASE "$DIR/."  \
    -f "$DIR/values.yaml" \
    --set provider="$PROVIDER" \
    --set prometheus.enabled=true \
    -n "$NAMESPACE" \
    --set CHAINS="$CHAINS_STR" \
    --set bundlerName="bundlers" \
    --set STATIC_IP_NAME="$IP_NAME" \
    --set-string namespace="$NAMESPACE" \
    --set average_http_requests_hpa=30 \
    --set average_cpu_hpa=500m \
    --set commonName="$DNS_NAME" \
    --set domains[0]="$DNS_NAME" \
    --set domains[1]="www.$DNS_NAME"
echo -e "####### Deployed $HELM_RELEASE to $NAMESPACE ####### \n";