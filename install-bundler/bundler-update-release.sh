
#!/opt/homebrew/bin/bash

set -e
RED='\033[0;31m'
NC='\033[0m'
GREEN='\033[0;32m'


CONFIG_FILE=$1

# Check if the required arguments are passed
# Example:  sh install-release-cloud.sh configs/testing.cfg
if [ "$#" -ne 1 ]; then
    echo " ${RED} Usage: $0 <CONFIG FILE RELATIVE PATH> for deployment ${NC}"
    exit 1
fi

echo "I came here $CONFIG_FILE"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ ! -f "$DIR/$CONFIG_FILE" ]; then
    echo "Error: Configuration file "$DIR/$CONFIG_FILE" not found. Choose from configs present in configs"
    exit 1
fi

if [ ! -r "$DIR/$CONFIG_FILE" ]; then
    echo "${RED} Error: Configuration file "$DIR/$CONFIG_FILE" not readable. ${NC}"
    exit 1
fi

echo "The config file being used : $DIR/$CONFIG_FILE"

bash bundler/install.sh $CONFIG_FILE
