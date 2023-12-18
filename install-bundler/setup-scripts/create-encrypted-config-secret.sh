ENCRYPTED_CONFIG_SECRET=$1

# Check if the secret already exists
if gcloud secrets describe "$ENCRYPTED_CONFIG_SECRET" &>/dev/null; then
    echo "Secret $ENCRYPTED_CONFIG_SECRET already exists."
    read -p "Do you want to overwrite? (yes/no): " RESPONSE
    case $RESPONSE in
        [yY] | [yY][eE][sS])
            # Ask the user for the file path
            read -p "Enter the file path for overwriting the secret: " FILEPATH

            # Check if the provided file path is valid
            if [[ ! -f $FILEPATH ]]; then
                echo "Error: Invalid file path."
                exit 1
            fi

            # Update the existing secret
            gcloud secrets versions add "$ENCRYPTED_CONFIG_SECRET" --data-file="$FILEPATH"
            echo "Secret $ENCRYPTED_CONFIG_SECRET has been updated."
            ;;
        *)
            echo "User chose not to overwrite. Continuing without updating the secret."
            ;;
    esac

else
    echo "Secret $ENCRYPTED_CONFIG_SECRET doesn't exist."
    # Ask the user for the file path since the secret needs to be created
    read -p "Enter the file path to create the secret: " FILEPATH

    # Check if the provided file path is valid
    if [[ ! -f $FILEPATH ]]; then
        echo "Error: Invalid file path."
        exit 1
    fi

    # Create a new secret
    gcloud secrets create "$ENCRYPTED_CONFIG_SECRET" --data-file="$FILEPATH"
    echo "Secret $ENCRYPTED_CONFIG_SECRET has been created."
fi

echo "ENCRYPTED_CONFIG_SECRET $ENCRYPTED_CONFIG_SECRET process completed."