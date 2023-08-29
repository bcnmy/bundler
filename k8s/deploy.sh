#!/bin/bash
set -e

echo "The number of arguments is: $#"

if [ $# -ne  4 ]; then
  echo "Invalid number of args provided. Required: 4. Provided: $#"
  echo "Usage: ./deploy.sh <number-of-replica> <env> <chart-name-prefix> <namespace>";
  printf "Supported vales for env: test, staging, and production\n\n";

  echo "Example: ./deploy.sh 3 prod prod-sdk-relayer sdk-prod";
  exit 1;
fi

REPLICAS=$1
ENV=$2
NAME=$3
NAMESPACE=$4
PODS_NAME="relayer-server"

echo "Number of replicas: $REPLICAS"
echo "ENV: $ENV"
echo "Chart Name: $NAME"
echo "Namespace: $NAMESPACE"

HELM_NAME="$NAME-common"
printf "\nDeploying %s to %s\n" "${HELM_NAME}" "${NAME}"


function pods_health_check {
  index=$1
  local pods
  pods=""
  pods="${PODS_NAME}${index}"-0

  [[ -z "${index}" ]] && { echo "must specify index" ; exit 1 ;  }

  echo "Checking if pods from previous stateful set are up "
  echo kubectl -n "${NAMESPACE}" get pods "${pods}"
  kubectl -n "${NAMESPACE}" get pods "${pods}"

  echo "Enabling port-forwarding to pods from previous set"
  echo kubectl -n "${NAMESPACE}" port-forward pod/"${pods}" 3033:3000 
  kubectl -n "${NAMESPACE}" port-forward pod/"${pods}" 3033:3000 &> port-forward.log & 
  #kubectl -n sdk-prod port-forward pod/relayer-server0-0 3033:3033 &
  sleep 5

  echo "Sending request to check if app is healthy"
  if curl localhost:3033/api/v2/56/o9VuULAhY.18c7bb9e-50a9-4d3d-8c17-4fcc32861429 \
        --header 'Content-Type: application/json' \
        --data '{
    "method": "eth_chainId",
    "params": [],
    "id": 1693061364,
    "jsonrpc": "2.0"
}' ; then
  echo ""
  echo "App OK"
  else
    echo "App is not OK"
  fi

  port_forward_pid=$(ps aux | grep [p]ort-forward | tr -s ' ' ' ' | cut -d ' ' -f 2)
  kill "${port_forward_pid}"
}

helm upgrade ./k8s/common/  "${HELM_NAME}"  \
     --install \
     --wait \
     --timeout 720s \
     --values ./k8s/common/values."${ENV}".yaml \
     --set-string namespace="${NAMESPACE}" \
     --namespace "${NAMESPACE}"

echo "Deployed $HELM_NAME to $NAMESPACE"

x=0
while [ "${x}" -lt  "${REPLICAS}" ]; do
  HELM_NAME="$NAME-$x";
  printf "\nDeploying %s to %s\n" "${HELM_NAME}" "${NAMESPACE}"
  
  helm upgrade "${HELM_NAME}" ./k8s/relayer/ \
       --install \
       --wait \
       --timeout 720s \
       --values ./k8s/relayer/values."${ENV}".yaml \
       --set-string namespace="${NAMESPACE}" \
       --set index="${x}" \
       --namespace "${NAMESPACE}"
  
  echo "Deployed ${HELM_NAME}to ${NAMESPACE}";
  # check if first stateful set was correctly updated
  pods_health_check "${x}"

  x=$(( x + 1 ))
done

printf "\nDeployment completed\n";

