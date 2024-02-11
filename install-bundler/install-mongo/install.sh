#!/bin/bash
set -e
NC='\033[0m'
YELLOW='\033[0;33m'

NAMESPACE=$1
HELM_RELEASE="mongo"
PAYMASTER_DBNAME=paymaster-dashboard
PAYMASTER_DBUSER=usertwo
PAYMASTER_DBPASWORD=usertwopassword
RELAYERNODE_DBNAME=relayer-node-service
RELAYERNODE_DBUSER=userone
RELAYERNODE_DBPASWORD=useronepassword

# Check if the required arguments are passed
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <NAMESPACE> for Mongo"
    exit 1
fi


printf "\n${YELLOW}------ Deploying %s to %s -----${NC}\n" "$HELM_RELEASE" "$NAMESPACE"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
helm upgrade --install --wait --timeout 720s $HELM_RELEASE "$DIR/mongodb/" \
  -n "$NAMESPACE" \
  -f "$DIR/mongodb/values.yaml" \
  --set auth.usernames[0]=$RELAYERNODE_DBUSER \
  --set auth.passwords[0]=$RELAYERNODE_DBPASWORD \
  --set auth.databases[0]=$RELAYERNODE_DBNAME \
  --set auth.usernames[1]=$PAYMASTER_DBUSER \
  --set auth.passwords[1]=$PAYMASTER_DBPASWORD \
  --set auth.databases[1]=$PAYMASTER_DBNAME \
  --set metrics.enabled=true \
  --set nameOverride=mongo

printf "Mongo deployment completed\n";
echo "To connect to the databases, use the following URLs:"
echo "Paymaster dashboard DB URL:"
echo "mongodb://$PAYMASTER_DBUSER:$PAYMASTER_DBPASWORD@$HELM_RELEASE.$NAMESPACE.svc.cluster.local:27017/$PAYMASTER_DBNAME"
echo ""
echo "RelayerNode DB URL:"
echo "mongodb://$RELAYERNODE_DBUSER:$RELAYERNODE_DBPASWORD@$HELM_RELEASE.$NAMESPACE.svc.cluster.local:27017/$RELAYERNODE_DBNAME"
echo ""
echo "To test connections"
echo "kubectl run -i --tty --rm debugmongo --image=mongo --restart=Never --namespace=$NAMESPACE -- bash"
echo "mongosh mongodb://mongo.$NAMESPACE.svc.cluster.local:27017/relayer-node-service -u userone -p useronepassword"