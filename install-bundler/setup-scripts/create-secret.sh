#!/bin/bash

SECRET_NAME=$1

# Check if the secret already exists
if gcloud secrets describe "$SECRET_NAME" &> /dev/null; then
  echo "Secret $SECRET_NAME already exists."
  # Ask for confirmation to update the secret
  read -rp "Do you want to update the secret? (y/N): " CONFIRMATION
  if [[ "$CONFIRMATION" =~ ^[Yy]$ ]]; then
    # The user confirmed to update the secret
    read -rsp "Enter the new password: " PASSWORD
    echo # move to a new line
    echo -n "$PASSWORD" | gcloud secrets versions add "$SECRET_NAME" --data-file=-
    if [[ $? -eq 0 ]]; then
      echo "Secret $SECRET_NAME updated successfully."
    else
      echo "Failed to update secret $SECRET_NAME."
    fi
  else
    echo "Update canceled."
  fi
else
  echo "Secret $SECRET_NAME does not exist."
  # Prompt for the password since we are creating a new secret
  read -rsp "Enter the password: " PASSWORD
  echo # move to a new line
  echo -n "$PASSWORD" | gcloud secrets create "$SECRET_NAME" --data-file=- --replication-policy="automatic"
  if [[ $? -eq 0 ]]; then
    echo "Secret $SECRET_NAME created successfully."
  else
    echo "Failed to create secret $SECRET_NAME."
  fi
fi
