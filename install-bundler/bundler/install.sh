#!/usr/bin/env bash
set -e

NC='\033[0m'
GREEN='\033[0;32m'

# ENV=$1
# NAMESPACE=$2
# PROVIDER=$3
# IMAGE=$4
# IMAGE_TAG=$5
# PROJECT_ID=$6
# CHAINS_CFG_FILENAME=$7
# KUBE_SERVICE_ACCOUNT=$8
CONFIG_FILE=$1


# Function to print in green
print_green() {
    echo -e "\033[0;32m$1\033[0m"
}


# DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# PARENT_DIR="$(dirname "$DIR")"
print_green "Loading ./$CONFIG_FILE ..."
source "./$CONFIG_FILE"


##This creates all the variables names based on the the env and the namespace.
## The variables that will be laoded from this create-variables.sh are 
## $KUBE_SERVICE_ACCOUNT, GCP_ENCRYPTED_CONFIG_SECRET, SECRET_NAME
print_green "Loading ./setup-scripts/create-variables.sh ..."
source "./setup-scripts/create-variables.sh" "./$CONFIG_FILE"


# Print each variable in green
print_green "Environment: $ENV"
print_green "Namespace: $NAMESPACE"
print_green "Provider: $PROVIDER"
print_green "Image: $IMAGE"
print_green "Image Tag: $IMAGE_TAG"
print_green "Project ID: $PROJECT_ID"
print_green "Chains Config Filename: $CHAINS_CFG_FILENAME"

# print_green "TO_BE_UPDATED_CHAINS: ${TO_BE_UPDATED_CHAINS[*]}"

print_green "Kube Service Account: $KUBE_SERVICE_ACCOUNT"
print_green "Encrypted Config Secret: $GCP_ENCRYPTED_CONFIG_SECRET"
print_green "Secret Name: $SECRET_NAME"


# GCP_ENCRYPTED_CONFIG_SECRET="$NAMESPACE-$ENV-bundler-config"
# SECRET_NAME="bundler-$NAMESPACE-PASSPHRASE"

# echo -e "Does the role ${GREEN} $GCP_IAM_ROLE  ${NC} exist in GCP IAM? (yes/no)"
# read answer

# if [ "$answer" == "yes" ]; then
#     echo "User confirmed the role exists."
#     # You can add any logic here if required.
# else
#     echo "User said the role does not exist."
#     echo "refer here https://cloud.google.com/kubernetes-engine/docs/tutorials/workload-identity-secrets#whats-next"
#     # You can add any logic here if required.
#     exit 1 
# fi




# Prompt to confirm the image
# echo -e "Confirm the image: $IMAGE and tag: $IMAGE_TAG and PROVIDER=$PROVIDER  (yes/no): "
# read response

# case "$response" in
#     [yY] | [yY][eE][sS] | "")
#         echo "Continuing with the process..."
#         ;;
#     *)
#         # If the answer is not "yes", assume it's "no" and exit.
#         echo "User did not confirm for image. Exiting."
#         exit 1
#         ;;
# esac

HELM_RELEASE="bundler";

SECONDS=0  # reset the SECONDS counter

# printf "\n${GREEN} ####### Deploying bundlers $HELM_RELEASE to $NAMESPACE ${NC} ####### \n"
# if [ "$PROVIDER"=="local" ]; then
#   printf "\n${GREEN} Setting minikube env to docker so that it can use local image for relayer ${NC}\n"
#   eval $(minikube docker-env)
# fi

# if [ "$ENV" == "test" ]; then
#     echo "Enter the config passphrase: "
#     read -s CONFIG_PASSPHRASE
#     echo  # This adds a newline after the hidden input

#     # Check if the passphrase is empty
#     if [ -z "$CONFIG_PASSPHRASE" ]; then
#         echo "Error: Config passphrase cannot be empty."
#         exit 1
#     fi
# fi


echo "Starting helm deployment"


##Reading the relevant*-chains.sh under thechains folder in which all the chians are defined.
print_green "Loading ./configs/chains/$CHAINS_CFG_FILENAME for all the individual chain configs ..."
source "./configs/chains/$CHAINS_CFG_FILENAME"

array_names=$(declare -p | grep -Eo 'chain_[a-zA-Z0-9_]+')


# print_green "CHAINS TO BE UPDATED ${TO_BE_UPDATED_CHAINS[*]}"
print_green "All Chains ${array_names[*]}"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

for array_name in $array_names; do

    eval "NAME=\${$array_name[name]}"
    # Using indirect referencing to get the "network" value of the current array
    eval "CHAIN_ID=\${$array_name[chainId]}"
    eval "AUTOSCALING_THRESHHOLD_HTTP_REQUESTS_PER_MINUTE=\${$array_name[autoScalingThreshholdHTTPRequestsPerMinute]}"
    eval "AUTOSCALING_THRESHHOLD_CPU=\${$array_name[autoScalingThreshholdCPU]}"
    eval "MIN_REPLICA=\${$array_name[minReplica]}"
    eval "MAX_REPLICA=\${$array_name[maxReplica]}"

    eval "MIN_RELAYER_COUNT=\${$array_name[minRelayerCount]}"
    eval "MAX_RELAYER_COUNT=\${$array_name[maxRelayerCount]}"
    eval "FUNDING_BALANCE_THRESHOLD=\${$array_name[fundingBalanceThreshold]}"
    eval "FUNDING_RELAYER_AMOUNT=\${$array_name[fundingRelayerAmount]}"


    echo -e "${GREEN}"
    echo -e "${GREEN}Name: ${NC} $NAME"
    echo -e "${GREEN}CHAIN_ID: ${NC} $CHAIN_ID"
    echo -e "${GREEN}AUTOSCALING_THRESHHOLD_CPU: ${NC} $AUTOSCALING_THRESHHOLD_CPU"
    echo -e "${GREEN}MIN_REPLICA: ${NC} $MIN_REPLICA"
    echo -e "${GREEN}MAX_REPLICA: ${NC} $MAX_REPLICA"
    echo -e "${GREEN}MIN_RELAYER_COUNT: ${NC} $MIN_RELAYER_COUNT"
    echo -e "${GREEN}MAX_RELAYER_COUNT: ${NC} $MAX_RELAYER_COUNT"
    echo -e "${GREEN}FUNDING_BALANCE_THRESHOLD: ${NC} $FUNDING_BALANCE_THRESHOLD"
    echo -e "${GREEN}FUNDING_RELAYER_AMOUNT: ${NC} $FUNDING_RELAYER_AMOUNT"
    ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS=$(bc -l <<< "$AUTOSCALING_THRESHHOLD_HTTP_REQUESTS_PER_MINUTE/60*1000" | cut -d'.' -f1)m
    echo -e "${GREEN}ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS: ${NC} ${ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS}"
    echo -e "${GREEN}QUEUE_URL: ${NC} $QUEUE_URL"

    ENCODED_SIMULATION_DATA_JSON=$(echo -n "$SIMULATION_DATA_JSON" | base64)
    echo -e "${GREEN}SIMULATION_DATA_JSON: ${NC} $SIMULATION_DATA_JSON"
    echo -e "${GREEN}ENCODED_SIMULATION_DATA_JSON: ${NC} $ENCODED_SIMULATION_DATA_JSON"


    ENCODED_TOKEN_PRICE_JSON=$(echo -n "$TOKEN_PRICE_JSON" | base64)
    echo -e "${GREEN}TOKEN_PRICE_JSON: ${NC} $TOKEN_PRICE_JSON"
    echo -e "${GREEN}ENCODED_TOKEN_PRICE_JSON: ${NC} $ENCODED_TOKEN_PRICE_JSON"

    ENCODED_SLACK_JSON=$(echo -n "$SLACK_JSON" | base64)
    echo -e "${GREEN}SLACK_JSON: ${NC} $SLACK_JSON"
    echo -e "${GREEN}ENCODED_SLACK_JSON: ${NC} $ENCODED_SLACK_JSON"

    ENCODED_PROVIDER_JSON=$(echo -n "$PROVIDER_JSON" | base64)
    echo -e "${GREEN}PROVIDER_JSON: ${NC} $PROVIDER_JSON"
    echo -e "${GREEN}ENCODED_PROVIDER_JSON: ${NC} $ENCODED_PROVIDER_JSON"


    
    ENCODED_DATASOURCES_JSON=$(echo -n "$DATASOURCES_JSON" | base64)
    echo -e "${GREEN}DATASOURCES_JSON: ${NC} $DATASOURCES_JSON"
    echo -e "${GREEN}ENCODED_DATASOURCES_JSON: ${NC} $ENCODED_DATASOURCES_JSON"


    ENCODED_SOCKET_SERVICE_JSON=$(echo -n "$SOCKET_SERVICE_JSON" | base64)
    echo -e "${GREEN}SOCKET_SERVICE_JSON: ${NC} $SOCKET_SERVICE_JSON"
    echo -e "${GREEN}ENCODED_SOCKET_SERVICE_JSON: ${NC} $ENCODED_SOCKET_SERVICE_JSON"

    echo -e "${NC}"
    echo " Deploying HELM chart for $NAME $CHAIN_ID"


    helm upgrade --install --wait --timeout 2200s "${HELM_RELEASE}-${CHAIN_ID}" "$DIR/."  \
        -f "$DIR/values.yaml" \
        -n "$NAMESPACE" \
        --set nameOverride="$NAME" \
        --set env="$ENV" \
        --set-string namespace="$NAMESPACE" \
        --set secret.passphrase.value="$CONFIG_PASSPHRASE" \
        --set CHAIN_ID="$CHAIN_ID" \
        --set provider="$PROVIDER" \
        --set prometheus.enabled=true \
        --set hpa.average_http_requests_hpa="${ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS}" \
        --set hpa.average_cpu_hpa="$AUTOSCALING_THRESHHOLD_CPU" \
        --set-string image.name="$IMAGE" \
        --set-string image.tag="$IMAGE_TAG" \
        --set-string minRelayerCount="$MIN_RELAYER_COUNT" \
        --set-string maxRelayerCount="$MAX_RELAYER_COUNT" \
        --set-string fundingBalanceThreshold="$FUNDING_BALANCE_THRESHOLD" \
        --set-string fundingRelayerAmount="$FUNDING_RELAYER_AMOUNT" \
        --set-string encodedSimulationDataJson="$ENCODED_SIMULATION_DATA_JSON" \
        --set-string encodedTokenPriceJson="$ENCODED_TOKEN_PRICE_JSON" \
        --set-string encodedSlackJson="$ENCODED_SLACK_JSON" \
        --set-string encodedProviderJson="$ENCODED_PROVIDER_JSON" \
        --set-string encodedDatasourcesJson="$ENCODED_DATASOURCES_JSON" \
        --set-string encodedSocketServiceJson="$ENCODED_SOCKET_SERVICE_JSON" \
        --set-string queueUrl="$QUEUE_URL" \
        --set-string gcpSecretManagerName="$GCP_SECRETS_MANAGER_NAME" \
        --set-string hpa.minReplicas="$MIN_REPLICA" \
        --set-string hpa.maxReplicas="$MAX_REPLICA" \
        --set-string projectId="$PROJECT_ID" \
        --set-string secretName="$SECRET_NAME" \
        --set-string configSecretName="$GCP_ENCRYPTED_CONFIG_SECRET" \
        --set-string serviceAccount="$KUBE_SERVICE_ACCOUNT" \
        --set datadog.enable=true \
        --set-string datadog.env="bundler-$NAMESPACE" \
        --set-string datadog.service="bundler-$NAMESPACE-$CHAIN_ID"
done
