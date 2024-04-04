#!/bin/bash
set -e
NC='\033[0m'
YELLOW='\033[0;33m'

ENV=$1
NAMESPACE=$2
HELM_RELEASE="bundler-common"

# Check if the required arguments are passed
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <ENV> <NAMESPACE> for Bundler common"
    exit 1
fi


printf "\n${YELLOW}------ Deploying %s to %s -----${NC}\n" "$HELM_RELEASE" "$NAMESPACE"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
helm upgrade --install --wait --timeout 720s $HELM_RELEASE "$DIR/bundler-common/" \
  -n "$NAMESPACE" \
  --set nameOverride=bundler-common

printf "bundler-common deployment completed\n";