

NAMESPACE=$1
PROJECT_ID=$2
SECRET_NAME=$3
GCP_SERVICE_ACCOUNT=$4
PASSPHRASE=$5


gcloud iam service-accounts create $GCP_SERVICE_ACCOUNT --display-name="Read secrets service account in $NAMESPACE for bundler"

echo "CONFIG_PASSPHRASE=$PASSPHRASE" | gcloud secrets create $SECRET_NAME  --data-file=-
gcloud secrets add-iam-policy-binding $SECRET_NAME \
    --member=serviceAccount:$GCP_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com \
    --role='roles/secretmanager.secretAccessor'