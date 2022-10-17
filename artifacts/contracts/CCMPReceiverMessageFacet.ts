const abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      }
    ],
    "name": "AlreadyExecuted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ContractIsPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "returndata",
        "type": "bytes"
      }
    ],
    "name": "ExternalCallFailed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "sourceChainId",
        "type": "uint256"
      },
      {
        "internalType": "contract ICCMPGateway",
        "name": "sourceGateway",
        "type": "address"
      }
    ],
    "name": "InvalidSource",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "adaptorName",
        "type": "string"
      }
    ],
    "name": "UnsupportedAdapter",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "VerificationFailed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "destinationChainId",
        "type": "uint256"
      },
      {
        "internalType": "contract ICCMPGateway",
        "name": "destinationGateway",
        "type": "address"
      }
    ],
    "name": "WrongDestination",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "contract ICCMPGateway",
        "name": "sourceGateway",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "contract ICCMPRouterAdaptor",
        "name": "sourceAdaptor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "sourceChainId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "contract ICCMPGateway",
        "name": "destinationGateway",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "destinationChainId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "routerAdaptor",
        "type": "string"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "feeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "feeAmount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "relayer",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct GasFeePaymentArgs",
        "name": "gasFeePaymentArgs",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "_calldata",
            "type": "bytes"
          }
        ],
        "indexed": false,
        "internalType": "struct CCMPMessagePayload[]",
        "name": "payload",
        "type": "tuple[]"
      }
    ],
    "name": "CCMPMessageExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "returndata",
        "type": "bytes"
      }
    ],
    "name": "CCMPPayloadExecuted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "contract ICCMPGateway",
            "name": "sourceGateway",
            "type": "address"
          },
          {
            "internalType": "contract ICCMPRouterAdaptor",
            "name": "sourceAdaptor",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "sourceChainId",
            "type": "uint256"
          },
          {
            "internalType": "contract ICCMPGateway",
            "name": "destinationGateway",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "destinationChainId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "routerAdaptor",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "feeTokenAddress",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "feeAmount",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "relayer",
                "type": "address"
              }
            ],
            "internalType": "struct GasFeePaymentArgs",
            "name": "gasFeePaymentArgs",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "to",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "_calldata",
                "type": "bytes"
              }
            ],
            "internalType": "struct CCMPMessagePayload[]",
            "name": "payload",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct CCMPMessage",
        "name": "_message",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "_verificationData",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "_allowPartialExecution",
        "type": "bool"
      }
    ],
    "name": "receiveMessage",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export { abi };