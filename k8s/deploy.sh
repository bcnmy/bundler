#!/bin/bash
set -e

echo "The number of arguments is: $#"

if [ $# -ne  4 ]; then
  echo "Invalid number of args provided. Required: 4. Provided: $#"
  echo "Usage: ./deploy.sh <number-of-replica> <env> <chart-name-prefix> <namespace>";
  printf "Supported vales for env: test, staging, and production\n\n";

  echo "Example: ./deploy.sh 3 staging staging-sdk-relayer sdk-relayer";
  exit 1;
fi

REPLICAS=$1;
ENV=$2;
NAME=$3;
NAMESPACE=$4;

echo "Number of replicas: $REPLICAS";
echo "ENV: $ENV";
echo "Chart Name: $NAME";
echo "Namespace: $NAMESPACE";

x=0
while [ $x -lt  $REPLICAS ]
do
  HELM_NAME="$NAME-$x";
  printf "\nDeploying $HELM_NAME to $NAMESPACE\n";
  
  helm upgrade --install --wait --timeout 720s $HELM_NAME ./k8s/relayer/ \
    -f ./k8s/relayer/values.$ENV.yaml \
    --set-string namespace=$NAMESPACE \
    --set index=$x \
    -n $NAMESPACE
  
  echo "Deployed $HELM_NAME to $NAMESPACE";

  x=$(( $x + 1 ))
done

printf "\nDeployment completed\n";
