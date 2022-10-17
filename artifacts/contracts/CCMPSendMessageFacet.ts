const abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      }
    ],
    "name": "AmountExceedsBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AmountIsZero",
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
        "name": "requiredAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualAmount",
        "type": "uint256"
      }
    ],
    "name": "InsufficientNativeAmount",
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
    "name": "InvalidPayload",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NativeAmountMismatch",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "relayer",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "NativeTransferFailed",
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
        "internalType": "uint256",
        "name": "destinationChainId",
        "type": "uint256"
      }
    ],
    "name": "UnsupportedDestinationChain",
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
    "name": "CCMPMessageRouted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "_tokenAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "_relayer",
        "type": "address"
      }
    ],
    "name": "FeePaid",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_destinationChainId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_adaptorName",
        "type": "string"
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
        "name": "_payloads",
        "type": "tuple[]"
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
        "name": "_gasFeePaymentArgs",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "_routerArgs",
        "type": "bytes"
      }
    ],
    "name": "sendMessage",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];

export { abi };
