export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
];

export const ENTRY_POINT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "preOpGas", type: "uint256" },
      { internalType: "uint256", name: "paid", type: "uint256" },
      { internalType: "uint48", name: "validAfter", type: "uint48" },
      { internalType: "uint48", name: "validUntil", type: "uint48" },
      { internalType: "bool", name: "targetSuccess", type: "bool" },
      { internalType: "bytes", name: "targetResult", type: "bytes" },
    ],
    name: "ExecutionResult",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "opIndex", type: "uint256" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    name: "FailedOp",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "SenderAddressResult",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "aggregator", type: "address" }],
    name: "SignatureValidationFailed",
    type: "error",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "preOpGas", type: "uint256" },
          { internalType: "uint256", name: "prefund", type: "uint256" },
          { internalType: "bool", name: "sigFailed", type: "bool" },
          { internalType: "uint48", name: "validAfter", type: "uint48" },
          { internalType: "uint48", name: "validUntil", type: "uint48" },
          { internalType: "bytes", name: "paymasterContext", type: "bytes" },
        ],
        internalType: "struct IEntryPoint.ReturnInfo",
        name: "returnInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "unstakeDelaySec", type: "uint256" },
        ],
        internalType: "struct IStakeManager.StakeInfo",
        name: "senderInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "unstakeDelaySec", type: "uint256" },
        ],
        internalType: "struct IStakeManager.StakeInfo",
        name: "factoryInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "unstakeDelaySec", type: "uint256" },
        ],
        internalType: "struct IStakeManager.StakeInfo",
        name: "paymasterInfo",
        type: "tuple",
      },
    ],
    name: "ValidationResult",
    type: "error",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "preOpGas", type: "uint256" },
          { internalType: "uint256", name: "prefund", type: "uint256" },
          { internalType: "bool", name: "sigFailed", type: "bool" },
          { internalType: "uint48", name: "validAfter", type: "uint48" },
          { internalType: "uint48", name: "validUntil", type: "uint48" },
          { internalType: "bytes", name: "paymasterContext", type: "bytes" },
        ],
        internalType: "struct IEntryPoint.ReturnInfo",
        name: "returnInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "unstakeDelaySec", type: "uint256" },
        ],
        internalType: "struct IStakeManager.StakeInfo",
        name: "senderInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "unstakeDelaySec", type: "uint256" },
        ],
        internalType: "struct IStakeManager.StakeInfo",
        name: "factoryInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "stake", type: "uint256" },
          { internalType: "uint256", name: "unstakeDelaySec", type: "uint256" },
        ],
        internalType: "struct IStakeManager.StakeInfo",
        name: "paymasterInfo",
        type: "tuple",
      },
      {
        components: [
          { internalType: "address", name: "aggregator", type: "address" },
          {
            components: [
              { internalType: "uint256", name: "stake", type: "uint256" },
              {
                internalType: "uint256",
                name: "unstakeDelaySec",
                type: "uint256",
              },
            ],
            internalType: "struct IStakeManager.StakeInfo",
            name: "stakeInfo",
            type: "tuple",
          },
        ],
        internalType: "struct IEntryPoint.AggregatorStakeInfo",
        name: "aggregatorInfo",
        type: "tuple",
      },
    ],
    name: "ValidationResultWithAggregation",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "userOpHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "factory",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "paymaster",
        type: "address",
      },
    ],
    name: "AccountDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [],
    name: "BeforeExecution",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalDeposit",
        type: "uint256",
      },
    ],
    name: "Deposited",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "aggregator",
        type: "address",
      },
    ],
    name: "SignatureAggregatorChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalStaked",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "unstakeDelaySec",
        type: "uint256",
      },
    ],
    name: "StakeLocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "withdrawTime",
        type: "uint256",
      },
    ],
    name: "StakeUnlocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "withdrawAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "StakeWithdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "userOpHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "paymaster",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "success",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "actualGasCost",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "actualGasUsed",
        type: "uint256",
      },
    ],
    name: "UserOperationEvent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "userOpHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "revertReason",
        type: "bytes",
      },
    ],
    name: "UserOperationRevertReason",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "withdrawAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Withdrawn",
    type: "event",
  },
  {
    inputs: [],
    name: "SIG_VALIDATION_FAILED",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes", name: "initCode", type: "bytes" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
    ],
    name: "_validateSenderAndPaymaster",
    outputs: [],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32", name: "unstakeDelaySec", type: "uint32" },
    ],
    name: "addStake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "depositTo",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "deposits",
    outputs: [
      { internalType: "uint112", name: "deposit", type: "uint112" },
      { internalType: "bool", name: "staked", type: "bool" },
      { internalType: "uint112", name: "stake", type: "uint112" },
      { internalType: "uint32", name: "unstakeDelaySec", type: "uint32" },
      { internalType: "uint48", name: "withdrawTime", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getDepositInfo",
    outputs: [
      {
        components: [
          { internalType: "uint112", name: "deposit", type: "uint112" },
          { internalType: "bool", name: "staked", type: "bool" },
          { internalType: "uint112", name: "stake", type: "uint112" },
          { internalType: "uint32", name: "unstakeDelaySec", type: "uint32" },
          { internalType: "uint48", name: "withdrawTime", type: "uint48" },
        ],
        internalType: "struct IStakeManager.DepositInfo",
        name: "info",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint192", name: "key", type: "uint192" },
    ],
    name: "getNonce",
    outputs: [{ internalType: "uint256", name: "nonce", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "initCode", type: "bytes" }],
    name: "getSenderAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "bytes", name: "initCode", type: "bytes" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "callGasLimit", type: "uint256" },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          { internalType: "uint256", name: "maxFeePerGas", type: "uint256" },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct UserOperation",
        name: "userOp",
        type: "tuple",
      },
    ],
    name: "getUserOpHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "address", name: "sender", type: "address" },
              { internalType: "uint256", name: "nonce", type: "uint256" },
              { internalType: "bytes", name: "initCode", type: "bytes" },
              { internalType: "bytes", name: "callData", type: "bytes" },
              {
                internalType: "uint256",
                name: "callGasLimit",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "verificationGasLimit",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "preVerificationGas",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "maxFeePerGas",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "maxPriorityFeePerGas",
                type: "uint256",
              },
              {
                internalType: "bytes",
                name: "paymasterAndData",
                type: "bytes",
              },
              { internalType: "bytes", name: "signature", type: "bytes" },
            ],
            internalType: "struct UserOperation[]",
            name: "userOps",
            type: "tuple[]",
          },
          {
            internalType: "contract IAggregator",
            name: "aggregator",
            type: "address",
          },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct IEntryPoint.UserOpsPerAggregator[]",
        name: "opsPerAggregator",
        type: "tuple[]",
      },
      { internalType: "address payable", name: "beneficiary", type: "address" },
    ],
    name: "handleAggregatedOps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "bytes", name: "initCode", type: "bytes" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "callGasLimit", type: "uint256" },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          { internalType: "uint256", name: "maxFeePerGas", type: "uint256" },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct UserOperation[]",
        name: "ops",
        type: "tuple[]",
      },
      { internalType: "address payable", name: "beneficiary", type: "address" },
    ],
    name: "handleOps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint192", name: "key", type: "uint192" }],
    name: "incrementNonce",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes", name: "callData", type: "bytes" },
      {
        components: [
          {
            components: [
              { internalType: "address", name: "sender", type: "address" },
              { internalType: "uint256", name: "nonce", type: "uint256" },
              {
                internalType: "uint256",
                name: "callGasLimit",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "verificationGasLimit",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "preVerificationGas",
                type: "uint256",
              },
              { internalType: "address", name: "paymaster", type: "address" },
              {
                internalType: "uint256",
                name: "maxFeePerGas",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "maxPriorityFeePerGas",
                type: "uint256",
              },
            ],
            internalType: "struct EntryPoint.MemoryUserOp",
            name: "mUserOp",
            type: "tuple",
          },
          { internalType: "bytes32", name: "userOpHash", type: "bytes32" },
          { internalType: "uint256", name: "prefund", type: "uint256" },
          { internalType: "uint256", name: "contextOffset", type: "uint256" },
          { internalType: "uint256", name: "preOpGas", type: "uint256" },
        ],
        internalType: "struct EntryPoint.UserOpInfo",
        name: "opInfo",
        type: "tuple",
      },
      { internalType: "bytes", name: "context", type: "bytes" },
    ],
    name: "innerHandleOp",
    outputs: [
      { internalType: "uint256", name: "actualGasCost", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint192", name: "", type: "uint192" },
    ],
    name: "nonceSequenceNumber",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "bytes", name: "initCode", type: "bytes" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "callGasLimit", type: "uint256" },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          { internalType: "uint256", name: "maxFeePerGas", type: "uint256" },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct UserOperation",
        name: "op",
        type: "tuple",
      },
      { internalType: "address", name: "target", type: "address" },
      { internalType: "bytes", name: "targetCallData", type: "bytes" },
    ],
    name: "simulateHandleOp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "bytes", name: "initCode", type: "bytes" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "callGasLimit", type: "uint256" },
          {
            internalType: "uint256",
            name: "verificationGasLimit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "preVerificationGas",
            type: "uint256",
          },
          { internalType: "uint256", name: "maxFeePerGas", type: "uint256" },
          {
            internalType: "uint256",
            name: "maxPriorityFeePerGas",
            type: "uint256",
          },
          { internalType: "bytes", name: "paymasterAndData", type: "bytes" },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct UserOperation",
        name: "userOp",
        type: "tuple",
      },
    ],
    name: "simulateValidation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unlockStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "withdrawAddress",
        type: "address",
      },
    ],
    name: "withdrawStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "withdrawAddress",
        type: "address",
      },
      { internalType: "uint256", name: "withdrawAmount", type: "uint256" },
    ],
    name: "withdrawTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
] as const;

export const OPTIMISM_L1_GAS_PRICE_ORACLE = [
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "gasPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "getL1Fee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "getL1GasUsed",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "l1BaseFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "overhead",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "scalar",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// https://explorer.mantle.xyz/address/0x420000000000000000000000000000000000000F
export const MANTLE_BVM_GAS_PRICE_ORACLE = [
  {
    type: "constructor",
    inputs: [{ type: "address", name: "_owner", internalType: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "IsBurning",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "charge",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "daGasPrice",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "daSwitch",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "decimals",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "gasPrice",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getL1Fee",
    inputs: [{ type: "bytes", name: "_data", internalType: "bytes" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "getL1GasUsed",
    inputs: [{ type: "bytes", name: "_data", internalType: "bytes" }],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "l1BaseFee",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "overhead",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "owner",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "renounceOwnership",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "", internalType: "uint256" }],
    name: "scalar",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "address", name: "", internalType: "address" }],
    name: "sccAddress",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setCharge",
    inputs: [{ type: "uint256", name: "_charge", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setDAGasPrice",
    inputs: [{ type: "uint256", name: "_daGasPrice", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setDaSwitch",
    inputs: [{ type: "uint256", name: "_daSwitch", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setDecimals",
    inputs: [{ type: "uint256", name: "_decimals", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setGasPrice",
    inputs: [{ type: "uint256", name: "_gasPrice", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setIsBurning",
    inputs: [{ type: "uint256", name: "_isBurning", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setL1BaseFee",
    inputs: [{ type: "uint256", name: "_baseFee", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setOverhead",
    inputs: [{ type: "uint256", name: "_overhead", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "setScalar",
    inputs: [{ type: "uint256", name: "_scalar", internalType: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [],
    name: "transferOwnership",
    inputs: [{ type: "address", name: "newOwner", internalType: "address" }],
  },
  {
    type: "event",
    name: "ChargeUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "DAGasPriceUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "DASwitchUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "DecimalsUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "GasPriceUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "IsBurningUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "L1BaseFeeUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OverheadUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { type: "address", name: "previousOwner", indexed: true },
      { type: "address", name: "newOwner", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ScalarUpdated",
    inputs: [{ type: "uint256", name: "", indexed: false }],
    anonymous: false,
  },
] as const;

export const ARBITRUM_L1_FEE = [
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "bool",
        name: "contractCreation",
        type: "bool",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "gasEstimateL1Component",
    outputs: [
      {
        internalType: "uint64",
        name: "gasEstimateForL1",
        type: "uint64",
      },
      {
        internalType: "uint256",
        name: "baseFee",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "l1BaseFeeEstimate",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export enum BLOCKCHAINS {
  MAINNET = 1,
  GOERLI = 5,
  POLYGON_MAINNET = 137,
  POLYGON_MUMBAI = 80001,
  BSC_TESTNET = 97,
  BSC_MAINNET = 56,
  POLYGON_ZKEVM_TESTNET = 1442,
  POLYGON_ZKEVM_MAINNET = 1101,
  ARBITRUM_GOERLI_TESTNET = 421613,
  ARBITRUM_ONE_MAINNET = 42161,
  ARBITRUM_NOVA_MAINNET = 42170,
  OPTIMISM_MAINNET = 10,
  OPTIMISM_GOERLI_TESTNET = 420,
  OP_BNB_MAINNET = 204,
  OP_BNB_TESTNET = 5611,
  MANTLE_MAINNET = 5000,
  MANTLE_TESTNET = 5001,
  AVALANCHE_MAINNET = 43114,
  AVALANCHE_TESTNET = 43113,
  MOONBEAM_MAINNET = 1284,
  MOONBASE_ALPHA_TESTNET = 1287,
  BASE_GOERLI_TESTNET = 84531,
  BASE_MAINNET = 8453,
  LINEA_TESTNET = 59140,
  LINEA_MAINNET = 59144,
  GANACHE = 1337,
  ASTAR_MAINNET = 592,
  CHILLIZ_MAINNET = 88888,
  ASTAR_TESTNET = 81,
  CHILLIZ_TESTNET = 88882,
  CORE_MAINNET = 1116,
  CORE_TESTNET = 1115,
  MANTA_TESTNET = 3441005,
  MANTA_MAINNET = 169,
  CAPX_CHAIN = 7116,
  COMBO_TESTNET = 91715,
  COMBO_MAINNET = 9980,
  ARBITRUM_SEPOLIA_TESTNET = 421614,
  SEPOLIA_TESTNET = 11155111,
  BERACHAIN_TESTNET = 80085,
  BLAST_TESTNET = 168587773,
  BASE_SEPOLIA_TESTNET = 84532,
  BLAST_MAINNET = 81457,
  SCROLL_SEPOLIA_TESTNET = 534351,
  SCROLL_MAINNET = 534352,
  ZEROONE_TESTNET = 56400,
}

// Network with base gas diff from 21k and maxPriorityFeePerGas is 0
export const L2Networks = [421613, 42161, 42170];
export const PolygonZKEvmNetworks = [1101, 1442];
export const OptimismNetworks = [
  420, 10, 84531, 8453, 204, 5611, 9980, 91715, 84532, 81457, 168587773,
  11155420,
];
export const LineaNetworks = [59140, 59144];
export const ArbitrumNetworks = [42170, 421613, 42161, 421614];
export const AlchemySimulateExecutionSupportedNetworks = [
  1, 5, 11155111, 137, 80001, 10, 420, 42161, 421613, 421614, 8453, 84531, 592,
];
export const AstarNetworks = [81, 592];
export const NetworksNotSupportingEthCallStateOverrides = [
  1101, 1442, 81, 592, 169, 3441005, 91715, 7116, 9980,
];
export const NetworksNotSupportingEthCallBytecodeStateOverrides = [
  1, 59140, 59144, 84532, 421614, 168587773, 80001, 43113, 11155111, 1101, 1442,
  420,
];
export const MantleNetworks = [5000, 5001];
export const ScrollNetworks = [534351, 534352];

export const pvgMarkUp: {
  [chainId: number]: number;
} = {
  1: 0.1,
  5: 0.1,
  80001: 0.1,
  137: 0.1,
  97: 0.1,
  56: 0.1,
  1442: 0.1,
  1101: 0.1,
  421613: 0.15,
  42161: 0.15,
  42170: 0.15,
  420: 0.15,
  10: 0.15,
  43114: 0.05,
  43113: 0.05,
  84531: 0.15,
  8453: 0.15,
  59140: 0.1,
  59144: 0.1,
  5000: 0.15,
  5001: 0.15,
  204: 0.15,
  5611: 0.15,
  592: 0.1,
  88888: 0.1,
  88882: 0.1,
  81: 0.1,
  1115: 0.1,
  1116: 0.1,
  169: 0.1,
  3441005: 0.1,
  91715: 0.15,
  9980: 0.15,
  7116: 0.1,
  421614: 0.1,
  11155111: 0.1,
  168587773: 0.15,
  84532: 0.15,
  80085: 0.1,
  81457: 0.15,
};

export const BLAST_PVG_VALUE = 700000000n;
export const MANTLE_L1_ROLL_UP_FEE_DIVISION_FACTOR = 10000000000n;
export const MANTLE_PUBLIC_RPC_URL_1 = "https://rpc.mantle.xyz";
export const MANTLE_PUBLIC_RPC_URL_2 = "https://rpc.ankr.com/mantle";
export const MANTLE_PUBLIC_RPC_URL_3 = "https://1rpc.io/mantle";
export const MANTLE_PRIVATE_RPC_URL_1 =
  "https://rpc.ankr.com/mantle/07101210d8974c619d563526229a15fdc1675bb1e862ed04a6b8c4e90fa45fab";
export const MANTLE_PRIVATE_RPC_URL_2 =
  "https://rpc.ankr.com/mantle/0f2ac70eb2e86d935951e9d3874deeb44525123a1ce2a7cf609cf1f0a098d2d6";
export const MANTLE_PRIVATE_RPC_URL_3 =
  "https://rpc.ankr.com/mantle/6ce34fc32c05d52c87f836fc1f994fd056b78c1d75ba9573a1ffbfcd8094287e";
export const BLAST_SEPOLIA_PUBLIC_RPC_URL = "https://sepolia.blast.io";
export const BLAST_SEPOLIA_PRIVATE_RPC_URL =
  "https://rpc.ankr.com/blast_testnet_sepolia/0f2ac70eb2e86d935951e9d3874deeb44525123a1ce2a7cf609cf1f0a098d2d6";
