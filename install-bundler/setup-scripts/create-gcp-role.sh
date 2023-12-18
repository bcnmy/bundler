
PROJECT_ID=$1
GCP_IAM_ROLE=$2
ENCRYPTED_CONFIG_SECRET=$3
SECRET_NAME=$4


echo "Creting GCP IAM role/service [$GCP_IAM_ROLE] account"
gcloud iam service-accounts create $GCP_IAM_ROLE  --display-name="Read secrets [$ENCRYPTED_CONFIG_SECRET] [$SECRET_NAME]"
echo "Creation of GCP IAM role/service [$GCP_IAM_ROLE] account completed"

echo "Adding role binding of GCP IAM role/service [$GCP_IAM_ROLE] to ENCRYPTED_CONFIG_SECRET=[$ENCRYPTED_CONFIG_SECRET]"
gcloud secrets add-iam-policy-binding $ENCRYPTED_CONFIG_SECRET \
    --member="serviceAccount:$GCP_IAM_ROLE@$PROJECT_ID.iam.gserviceaccount.com" \
    --role='roles/secretmanager.secretAccessor'
echo "Role binding of GCP IAM role/service [$GCP_IAM_ROLE] to ENCRYPTED_CONFIG_SECRET=[$ENCRYPTED_CONFIG_SECRET] completed"

echo "Adding role binding of GCP IAM role/service [$GCP_IAM_ROLE] to SECRET_NAME=[$SECRET_NAME]"
gcloud secrets add-iam-policy-binding $SECRET_NAME \
    --member="serviceAccount:$GCP_IAM_ROLE@$PROJECT_ID.iam.gserviceaccount.com" \
    --role='roles/secretmanager.secretAccessor'
echo "Role binding of GCP IAM role/service [$GCP_IAM_ROLE] to SECRET_NAME=[$SECRET_NAME] completed"