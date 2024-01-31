#!/usr/bin/env bash
GCP_ENCRYPTED_CONFIG_SECRET=$1

# Check if the secret already exists
if gcloud secrets describe "$GCP_ENCRYPTED_CONFIG_SECRET" &>/dev/null; then
    echo "Secret $GCP_ENCRYPTED_CONFIG_SECRET already exists."
    read -p -r "Do you want to overwrite? (yes/no): " RESPONSE
    case $RESPONSE in
        [yY] | [yY][eE][sS])
            # Ask the user for the file path
            read -p -r "Enter the file path for overwriting the secret: " FILEPATH

            # Check if the provided file path is valid
            if [[ ! -f $FILEPATH ]]; then
                echo "Error: Invalid file path."
                exit 1
            fi

            # Update the existing secret
            gcloud secrets versions add "$GCP_ENCRYPTED_CONFIG_SECRET" --data-file="$FILEPATH"
            echo "Secret $GCP_ENCRYPTED_CONFIG_SECRET has been updated."
            ;;
        *)
            echo "User chose not to overwrite. Continuing without updating the secret."
            ;;
    esac

else
    GIT_ROOT=$(git rev-parse --show-toplevel)
    FILEPATH="${GIT_ROOT}/config.json.enc"
    echo "GCP Secret $GCP_ENCRYPTED_CONFIG_SECRET doesn't exist."
    echo "Creating it now from ${FILEPATH}"

    # Check if the provided file path is valid
    if [[ ! -f $FILEPATH ]]; then
        echo "Error: Invalid file path ${FILEPATH}"
        exit 1
    fi

    # Create a new secret
    gcloud secrets create "${GCP_ENCRYPTED_CONFIG_SECRET}" --data-file="${FILEPATH}"
    echo "Secret ${GCP_ENCRYPTED_CONFIG_SECRET} has been created."
fi

echo "GCP_ENCRYPTED_CONFIG_SECRET $GCP_ENCRYPTED_CONFIG_SECRET process completed."