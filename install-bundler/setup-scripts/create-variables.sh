
CONFIG_FILE=$1

CURRENT_CONTEXT=$(kubectl config current-context)
CLUSTER_NAME=$(echo "$CURRENT_CONTEXT" | awk -F '_' '{print $NF}')
TRIMMED_CLUSTER_NAME=$(echo "$CLUSTER_NAME" | cut -c 1-8)
TRIMMED_NAMESPACE=$(echo "$NAMESPACE" | cut -c 1-10)

GCP_IAM_ROLE="$TRIMMED_CLUSTER_NAME-$TRIMMED_NAMESPACE-bund"
GCP_ENCRYPTED_CONFIG_SECRET="$TRIMMED_CLUSTER_NAME-$TRIMMED_NAMESPACE-config"
GCP_PLAINTEXT_CONFIG_SECRET="$TRIMMED_CLUSTER_NAME-$TRIMMED_NAMESPACE-cfg-plain"
GCP_PLAIN_CONFIG_SECRET="$ENV-tw-bundler-plain-config"
SECRET_NAME="$TRIMMED_CLUSTER_NAME-$TRIMMED_NAMESPACE-passphrase"
KUBE_SERVICE_ACCOUNT="$TRIMMED_CLUSTER_NAME-$TRIMMED_NAMESPACE-$ENV-sa"