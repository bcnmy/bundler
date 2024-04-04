

PROJECT_ID=$1
SECRET_NAME=$2


# echo "9090biconew" | gcloud secrets versions add $SECRET_NAME  --data-file=-
# Check if the secret exists in GCP Secret Manager
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
    echo "The secret exists in GCP Secret Manager."
else
    echo "The secret does not exist in GCP Secret Manager."
fi