#!/bin/sh

# Set ORDINAL_INDEX from file
export NODE_PATH_INDEX=$(cat /etc/podinfo/ordinal_index)

# Start Node.js application

# Command to run the application
node server/dist/server/src/index.js