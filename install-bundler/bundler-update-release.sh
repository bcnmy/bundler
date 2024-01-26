#!/opt/homebrew/bin/bash
set -e

RED='\033[0;31m'
NC='\033[0m'

CONFIG_FILE=$1
CONTAINER_IMAGE_TAG=$2

echo "Running script $0"

GIT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
echo "GIT_ROOT is ${GIT_ROOT}"
CONFIG_FILE_PATH="${GIT_ROOT}/install-bundler/configs/${CONFIG_FILE}"

# Check if the required arguments are passed
# Example:  sh install-release-cloud.sh configs/testing.cfg
if [ "$#" -gt 2 ]; then
  # shellcheck disable=SC2059
  printf "${RED} Usage: $0 <CONFIG FILE RELATIVE PATH> <CONTAINER_IMAGE_TAG> for deployment ${NC}\n"
  echo "$#"
  exit 1
fi


if [ ! -f "${CONFIG_FILE_PATH}" ]; then
    echo "Error: Configuration file ${CONFIG_FILE_PATH} not found. Choose from configs present in configs"
    exit 1
fi

if [ ! -r "${CONFIG_FILE_PATH}" ]; then
    echo "Error: Configuration file ${CONFIG_FILE_PATH} not readable."
    exit 1
fi

if [[ -n "${CONTAINER_IMAGE_TAG}" ]] ; then
  echo "Setting IMAGE_TAG to ${CONTAINER_IMAGE_TAG}" 
  sed -in -E "s/(^IMAGE_TAG=)(.*)/\1${CONTAINER_IMAGE_TAG}/g" "${CONFIG_FILE_PATH}" 
fi

echo "$0 calling  ${GIT_ROOT}/install-bundler/bundler/install.sh ${CONFIG_FILE}"
bash "${GIT_ROOT}"/install-bundler/bundler/install.sh "${CONFIG_FILE}"
