

NAMESPACE=$1
PROJECT_ID=$2
GCP_IAM_ROLE=$3
SERVICE_ACCOUNT=$4

if kubectl get serviceaccount $SERVICE_ACCOUNT --namespace=$NAMESPACE &> /dev/null; then
    echo "$SERVICE_ACCOUNT in $NAMESPACE already exists. Skipping creation."
else
    echo "Creating $SERVICE_ACCOUNT in $NAMESPACE "
    kubectl create serviceaccount $SERVICE_ACCOUNT --namespace=$NAMESPACE
    echo "$SERVICE_ACCOUNT in $NAMESPACE created"
fi

echo "Binding $GCP_IAM_ROLE with kubernetes $SERVICE_ACCOUNT for workloadIdentityUser in $NAMESPACE"
gcloud iam service-accounts add-iam-policy-binding "${GCP_IAM_ROLE}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --member="serviceAccount:${PROJECT_ID}.svc.id.goog[${NAMESPACE}/${SERVICE_ACCOUNT}]" \
    --role='roles/iam.workloadIdentityUser'
echo "Binding Complete"


echo "Annotating $GCP_IAM_ROLE with kubernetes $SERVICE_ACCOUNT for workloadIdentityUser in $NAMESPACE"
kubectl annotate serviceaccount "$SERVICE_ACCOUNT" \
    --namespace="$NAMESPACE" \
    iam.gke.io/gcp-service-account="$GCP_IAM_ROLE@$PROJECT_ID.iam.gserviceaccount.com"

echo "Annotation Complete"
