#!/usr/bin/env bash

CONFIG_FILE=$1
GIT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
CONFIG_FILE_PATH="${GIT_ROOT}/install-bundler/configs/${CONFIG_FILE}"

echo "$0 Working with CONFIG_FILE_PATH ${CONFIG_FILE_PATH}"
# Function to print in green
print_green() {
    echo -e "\033[0;32m$1\033[0m"
}

if [ ! -f "${CONFIG_FILE_PATH}" ]; then
    echo "Error: Configuration file ${CONFIG_FILE_PATH} not found. Choose from configs present in configs"
    exit 1
fi

# shellcheck disable=SC1091
print_green "Loading ${CONFIG_FILE_PATH}"
# shellcheck disable=SC1090
source "${CONFIG_FILE_PATH}"
echo "Sourced variables from config file:"
echo "NAMESPACE=${NAMESPACE}"
echo "PROJECT_ID=${PROJECT_ID}"
echo "IMAGE=${IMAGE}"
echo "IMAGE_TAG=${IMAGE_TAG}"
echo "DNS_NAME=${DNS_NAME}"
echo "IP_NAME=${IP_NAME}"
echo "CHAINS_CFG_FILENAME=${CHAINS_CFG_FILENAME}"
echo "CONTEXT=${CONTEXT}"
echo ""

if [[ -z "${NAMESPACE}" ]] ; then
  echo "Required configuration variable NAMESPACE was not specified"
  exit 1
elif [[ -z "${PROJECT_ID}" ]] ; then
  echo "Required configuration variable PROJECT_ID was not specified"
  exit 1
elif [[ -z "${IMAGE}" ]] ; then
  echo "Required configuration variable IMAGE was not specified"
  exit 1
elif [[ -z "${IMAGE_TAG}" ]] ; then
  echo "Required configuration variable IMAGE_TAG was not specified"
  exit 1
elif [[ -z "${DNS_NAME}" ]] ; then
  echo "Required configuration variable DNS_NAME was not specified"
  exit 1
elif [[ -z "${IP_NAME}" ]] ; then
  echo "Required configuration variable IP_NAME was not specified"
  exit 1
elif [[ -z "${CHAINS_CFG_FILENAME}" ]] ; then
  echo "Required configuration variable CHAINS_CFG_FILENAME was not specified"
  exit 1
elif [[ -z "${CONTEXT}" ]] ; then
  echo "Required configuration variable CONTEXT was not specified"
  exit 1
else
  echo "All required config variables were specified"
  echo ""
fi

echo ""
echo "Setting default project to ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

CURRENT_CONTEXT=$(kubectl config current-context)
if [[ "${CURRENT_CONTEXT}" != "${CONTEXT}" ]] ; then
  echo "Setting kubectl context to ${CONTEXT}"
  kubectl config use-context "${CONTEXT}"
else
  echo "Kubectl context is ${CONTEXT}"
fi

print_green "Loading ${GIT_ROOT}/install-bundler/setup-scripts/create-variables.sh"
# shellcheck disable=SC1091
source "${GIT_ROOT}/install-bundler/setup-scripts/create-variables.sh" "${CONFIG_FILE_PATH}"
echo "Created variables:"
echo "CURRENT_CONTEXT=${CURRENT_CONTEXT}"
echo "CLUSTER_NAME=${CLUSTER_NAME}"
echo "TRIMMED_CLUSTER_NAME=${TRIMMED_CLUSTER_NAME}"
echo "TRIMMED_NAMESPACE=${TRIMMED_NAMESPACE}"
echo "GCP_IAM_ROLE=${GCP_IAM_ROLE}"
echo "GCP_ENCRYPTED_CONFIG_SECRET=${GCP_ENCRYPTED_CONFIG_SECRET}"
echo "GCP_PLAINTEXT_CONFIG_SECRET=${GCP_PLAINTEXT_CONFIG_SECRET}"
echo "SECRET_NAME=${SECRET_NAME}"
echo "KUBE_SERVICE_ACCOUNT=${KUBE_SERVICE_ACCOUNT}"
echo ""


echo ""
echo "Getting config values from GCP secret ${GCP_PLAINTEXT_CONFIG_SECRET}"
# when gcloud commands are run in githubaction always specify --project because 
# it has the highest level of precedence
GCP_SECRET_CONFIG_VALUE=$(gcloud secrets versions access latest \
                                 --secret="${GCP_PLAINTEXT_CONFIG_SECRET}"\
                                 --project="${PROJECT_ID}")

if [[ -z "${GCP_SECRET_CONFIG_VALUE}" ]] ; then 
  msj=""
  msj="GCP_SECRET_CONFIG_VALUE can't be empty string."
  msj="${msj} Please make sure that secret named ${GCP_PLAINTEXT_CONFIG_SECRET} has data"
  echo "${msj}"
  exit 1
fi

if ! kubectl get namespace "${NAMESPACE}"; then
  echo "Error: ${NAMESPACE} doesnt exists, creating it now"
  kubectl create ns "${NAMESPACE}"
else
  # shellcheck disable=SC2059
  printf "${GREEN} SUCCESS: ${NAMESPACE} exists ${NC}\n"
fi

# TODO: Add 2 more variables in chains.sh: memory and CPU, and pass those to helm 
# TODO: rm printing of passwords to stdout

HELM_RELEASE="bundler";
SECONDS=0  # reset the SECONDS counter

echo "Starting helm deployment"

##Reading the relevant*-chains.sh under thechains folder in which all the chians are defined.
print_green "Loading ${GIT_ROOT}/install-bundler/configs/chains/$CHAINS_CFG_FILENAME"
# old source "./configs/chains/$CHAINS_CFG_FILENAME"
# shellcheck disable=SC1090
source "${GIT_ROOT}/install-bundler/configs/chains/$CHAINS_CFG_FILENAME"
# example of sourced variables
# declare -A chain_mumbai=(
#   [name]='chain-80001'
#   [chainId]="80001"
#   [autoScalingThreshholdHTTPRequestsPerMinute]=10000
#   [autoScalingThreshholdCPU]=2500m
#   [minReplica]=8
#   [maxReplica]=8
#   )

array_names=$(declare -p | grep -Eo 'chain_[a-zA-Z0-9_]+')
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

for array_name in $array_names; do
    # shellcheck disable=SC1087
    eval "NAME=\${$array_name[name]}"
    # Using indirect referencing to get the "network" value of the current array
    # shellcheck disable=SC1087
    eval "CHAIN_ID=\${$array_name[chainId]}"
    # shellcheck disable=SC1087
    eval "AUTOSCALING_THRESHHOLD_HTTP_REQUESTS_PER_MINUTE=\${$array_name[autoScalingThreshholdHTTPRequestsPerMinute]}"
    # shellcheck disable=SC1087
    eval "AUTOSCALING_THRESHHOLD_CPU=\${$array_name[autoScalingThreshholdCPU]}"
    # shellcheck disable=SC1087
    eval "MIN_REPLICA=\${$array_name[minReplica]}"
    # shellcheck disable=SC1087
    eval "MAX_REPLICA=\${$array_name[maxReplica]}"

    ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS=$(bc -l <<< "$AUTOSCALING_THRESHHOLD_HTTP_REQUESTS_PER_MINUTE/60*1000" | cut -d'.' -f1)m

    echo ""
    print_green "Name=$NAME"
    print_green "CHAIN_ID=$CHAIN_ID"
    print_green "AUTOSCALING_THRESHHOLD_CPU=$AUTOSCALING_THRESHHOLD_CPU"
    print_green "MIN_REPLICA=$MIN_REPLICA"
    print_green "MAX_REPLICA=$MAX_REPLICA"
    print_green "ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS=${ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS}"

    echo ""
    echo "Deploying HELM chart for $NAME $CHAIN_ID"

    # helm template "${HELM_RELEASE}-${CHAIN_ID}" "$DIR/."  \
    helm upgrade --install "${HELM_RELEASE}-${CHAIN_ID}" "$DIR/."  \
        --wait \
        --timeout 600s \
        --values "$DIR/values.yaml" \
        --namespace "$NAMESPACE" \
        --set nameOverride="$NAME" \
        --set env="$ENV" \
        --set environment="$environment" \
        --set-string namespace="$NAMESPACE" \
        --set secret.passphrase.value="$CONFIG_PASSPHRASE" \
        --set CHAIN_ID="$CHAIN_ID" \
        --set provider="$PROVIDER" \
        --set prometheus.enabled=true \
        --set hpa.average_http_requests_hpa="${ADJ_AUTOSCALING_THRESHHOLD_HTTP_REQUESTS}" \
        --set hpa.average_cpu_hpa="$AUTOSCALING_THRESHHOLD_CPU" \
        --set-string image.name="$IMAGE" \
        --set-string image.tag="$IMAGE_TAG" \
        --set-string gcpSecretManagerName="$GCP_SECRETS_MANAGER_NAME" \
        --set-string hpa.minReplicas="$MIN_REPLICA" \
        --set-string hpa.maxReplicas="$MAX_REPLICA" \
        --set-string projectId="$PROJECT_ID" \
        --set-string secretName="$SECRET_NAME" \
        --set-string configSecretName="$GCP_ENCRYPTED_CONFIG_SECRET" \
        --set-string plainConfigSecretName="$GCP_PLAINTEXT_CONFIG_SECRET" \
        --set-string serviceAccount="$KUBE_SERVICE_ACCOUNT" \
        --set datadog.enable=true \
        --set-string datadog.env="bundler-$NAMESPACE" \
        --set-string datadog.service="bundler-$NAMESPACE-$CHAIN_ID"
done
