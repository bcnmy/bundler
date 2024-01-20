#!/bin/bash
set -e

NC='\033[0m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'

NAMESPACE=$1
REDIS_MASTER_REPLICA=$2
REDIS_READ_REPLICA=$3
HELM_RELEASE="redis"
REDIS_ROOT_PASSWORD=IAMredis985834

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <NAMESPACE> <REDIS_MASTER_REPLICA <REDIS_READ_REPLICA> for Redis"
    exit 1
fi
printf "\n${YELLOW}------ Deploying %s to %s -----${NC}\n" "$HELM_RELEASE" "$NAMESPACE"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

helm upgrade --install --wait --timeout 720s $HELM_RELEASE "$DIR/redis/" \
  -n  "$NAMESPACE" \
  -f "$DIR/redis/values.yaml" \
  -f "$DIR/custom-values.yaml" \
  --set master.replicaCount=$REDIS_MASTER_REPLICA \
  --set replica.replicaCount=$REDIS_READ_REPLICA \
  --set auth.password=$REDIS_ROOT_PASSWORD \
  --set nameOverride=$HELM_RELEASE
printf "Mongo deployment completed\n";
printf "Redis url %s<<redis://:%s@%s.%s.svc.cluster.local:6379>>%s\n" "$GREEN" "$REDIS_ROOT_PASSWORD" "$HELM_RELEASE" "$NAMESPACE" "$NC";

# Print help statements
echo "To debug Redis, you can use the following commands:"
echo "#kubectl run redis-debug --rm -i --tty --image redis:latest -- bash"
echo "If you want to benchmark your redis installation"
echo "redis-benchmark -h 127.0.0.1 -p <redis_port> -c 100 -n 100000 -a <redis_password>"
echo "${GREEN}#redis-cli -h redis-master.$NAMESPACE.svc.cluster.local -a $REDIS_ROOT_PASSWORD${NC}"
