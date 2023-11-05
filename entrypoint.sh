#!/bin/sh

# Set ORDINAL_INDEX from file

## this is being mounted from the kubernetes statefulset
## the nodepathindex will be extracetd from the statefulset
#ordinal index and will be written to this path.
export NODE_PATH_INDEX=$(cat /etc/podinfo/ordinal_index)


## this is being mounted from the kubernetes statefulset
## the secret will be read from the relevant secret
# and will be written at this path
export CONFIG_PASSPHRASE=$(cat /gcpsecrets/config-passphrase)

# Start Node.js application

# Command to run the application
yarn run start