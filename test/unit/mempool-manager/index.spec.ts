import { ethers } from 'ethers';
import { ICacheService } from '../../../common/cache';
import { MempoolManager } from '../../../common/mempool-manager';

const entryPointAbi = [{ inputs: [{ internalType: 'uint256', name: 'preOpGas', type: 'uint256' }, { internalType: 'uint256', name: 'paid', type: 'uint256' }, { internalType: 'uint48', name: 'validAfter', type: 'uint48' }, { internalType: 'uint48', name: 'validUntil', type: 'uint48' }, { internalType: 'bool', name: 'targetSuccess', type: 'bool' }, { internalType: 'bytes', name: 'targetResult', type: 'bytes' }], name: 'ExecutionResult', type: 'error' }, { inputs: [{ internalType: 'uint256', name: 'opIndex', type: 'uint256' }, { internalType: 'string', name: 'reason', type: 'string' }], name: 'FailedOp', type: 'error' }, { inputs: [{ internalType: 'address', name: 'sender', type: 'address' }], name: 'SenderAddressResult', type: 'error' }, { inputs: [{ internalType: 'address', name: 'aggregator', type: 'address' }], name: 'SignatureValidationFailed', type: 'error' }, {
  inputs: [{
    components: [{ internalType: 'uint256', name: 'preOpGas', type: 'uint256' }, { internalType: 'uint256', name: 'prefund', type: 'uint256' }, { internalType: 'bool', name: 'sigFailed', type: 'bool' }, { internalType: 'uint48', name: 'validAfter', type: 'uint48' }, { internalType: 'uint48', name: 'validUntil', type: 'uint48' }, { internalType: 'bytes', name: 'paymasterContext', type: 'bytes' }], internalType: 'struct IEntryPoint.ReturnInfo', name: 'returnInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'senderInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'factoryInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'paymasterInfo', type: 'tuple',
  }],
  name: 'ValidationResult',
  type: 'error',
}, {
  inputs: [{
    components: [{ internalType: 'uint256', name: 'preOpGas', type: 'uint256' }, { internalType: 'uint256', name: 'prefund', type: 'uint256' }, { internalType: 'bool', name: 'sigFailed', type: 'bool' }, { internalType: 'uint48', name: 'validAfter', type: 'uint48' }, { internalType: 'uint48', name: 'validUntil', type: 'uint48' }, { internalType: 'bytes', name: 'paymasterContext', type: 'bytes' }], internalType: 'struct IEntryPoint.ReturnInfo', name: 'returnInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'senderInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'factoryInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'paymasterInfo', type: 'tuple',
  }, {
    components: [{ internalType: 'address', name: 'aggregator', type: 'address' }, {
      components: [{ internalType: 'uint256', name: 'stake', type: 'uint256' }, { internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256' }], internalType: 'struct IStakeManager.StakeInfo', name: 'stakeInfo', type: 'tuple',
    }],
    internalType: 'struct IEntryPoint.AggregatorStakeInfo',
    name: 'aggregatorInfo',
    type: 'tuple',
  }],
  name: 'ValidationResultWithAggregation',
  type: 'error',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'userOpHash', type: 'bytes32',
  }, {
    indexed: true, internalType: 'address', name: 'sender', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'factory', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'paymaster', type: 'address',
  }],
  name: 'AccountDeployed',
  type: 'event',
}, {
  anonymous: false, inputs: [], name: 'BeforeExecution', type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'totalDeposit', type: 'uint256',
  }],
  name: 'Deposited',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'aggregator', type: 'address',
  }],
  name: 'SignatureAggregatorChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'totalStaked', type: 'uint256',
  }, {
    indexed: false, internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256',
  }],
  name: 'StakeLocked',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'withdrawTime', type: 'uint256',
  }],
  name: 'StakeUnlocked',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'withdrawAddress', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256',
  }],
  name: 'StakeWithdrawn',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'userOpHash', type: 'bytes32',
  }, {
    indexed: true, internalType: 'address', name: 'sender', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'paymaster', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'nonce', type: 'uint256',
  }, {
    indexed: false, internalType: 'bool', name: 'success', type: 'bool',
  }, {
    indexed: false, internalType: 'uint256', name: 'actualGasCost', type: 'uint256',
  }, {
    indexed: false, internalType: 'uint256', name: 'actualGasUsed', type: 'uint256',
  }],
  name: 'UserOperationEvent',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'userOpHash', type: 'bytes32',
  }, {
    indexed: true, internalType: 'address', name: 'sender', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'nonce', type: 'uint256',
  }, {
    indexed: false, internalType: 'bytes', name: 'revertReason', type: 'bytes',
  }],
  name: 'UserOperationRevertReason',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'withdrawAddress', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256',
  }],
  name: 'Withdrawn',
  type: 'event',
}, {
  inputs: [], name: 'SIG_VALIDATION_FAILED', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' }], name: '_validateSenderAndPaymaster', outputs: [], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint32', name: 'unstakeDelaySec', type: 'uint32' }], name: 'addStake', outputs: [], stateMutability: 'payable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'depositTo', outputs: [], stateMutability: 'payable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'deposits', outputs: [{ internalType: 'uint112', name: 'deposit', type: 'uint112' }, { internalType: 'bool', name: 'staked', type: 'bool' }, { internalType: 'uint112', name: 'stake', type: 'uint112' }, { internalType: 'uint32', name: 'unstakeDelaySec', type: 'uint32' }, { internalType: 'uint48', name: 'withdrawTime', type: 'uint48' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
  name: 'getDepositInfo',
  outputs: [{
    components: [{ internalType: 'uint112', name: 'deposit', type: 'uint112' }, { internalType: 'bool', name: 'staked', type: 'bool' }, { internalType: 'uint112', name: 'stake', type: 'uint112' }, { internalType: 'uint32', name: 'unstakeDelaySec', type: 'uint32' }, { internalType: 'uint48', name: 'withdrawTime', type: 'uint48' }], internalType: 'struct IStakeManager.DepositInfo', name: 'info', type: 'tuple',
  }],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint192', name: 'key', type: 'uint192' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: 'nonce', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes', name: 'initCode', type: 'bytes' }], name: 'getSenderAddress', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'userOp', type: 'tuple',
  }],
  name: 'getUserOpHash',
  outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{
    components: [{
      components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation[]', name: 'userOps', type: 'tuple[]',
    }, { internalType: 'contract IAggregator', name: 'aggregator', type: 'address' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }],
    internalType: 'struct IEntryPoint.UserOpsPerAggregator[]',
    name: 'opsPerAggregator',
    type: 'tuple[]',
  }, { internalType: 'address payable', name: 'beneficiary', type: 'address' }],
  name: 'handleAggregatedOps',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation[]', name: 'ops', type: 'tuple[]',
  }, { internalType: 'address payable', name: 'beneficiary', type: 'address' }],
  name: 'handleOps',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{ internalType: 'uint192', name: 'key', type: 'uint192' }], name: 'incrementNonce', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'bytes', name: 'callData', type: 'bytes' }, {
    components: [{
      components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }], internalType: 'struct EntryPoint.MemoryUserOp', name: 'mUserOp', type: 'tuple',
    }, { internalType: 'bytes32', name: 'userOpHash', type: 'bytes32' }, { internalType: 'uint256', name: 'prefund', type: 'uint256' }, { internalType: 'uint256', name: 'contextOffset', type: 'uint256' }, { internalType: 'uint256', name: 'preOpGas', type: 'uint256' }],
    internalType: 'struct EntryPoint.UserOpInfo',
    name: 'opInfo',
    type: 'tuple',
  }, { internalType: 'bytes', name: 'context', type: 'bytes' }],
  name: 'innerHandleOp',
  outputs: [{ internalType: 'uint256', name: 'actualGasCost', type: 'uint256' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }, { internalType: 'uint192', name: '', type: 'uint192' }], name: 'nonceSequenceNumber', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'op', type: 'tuple',
  }, { internalType: 'address', name: 'target', type: 'address' }, { internalType: 'bytes', name: 'targetCallData', type: 'bytes' }],
  name: 'simulateHandleOp',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGasLimit', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'userOp', type: 'tuple',
  }],
  name: 'simulateValidation',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [], name: 'unlockStake', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address payable', name: 'withdrawAddress', type: 'address' }], name: 'withdrawStake', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address payable', name: 'withdrawAddress', type: 'address' }, { internalType: 'uint256', name: 'withdrawAmount', type: 'uint256' }], name: 'withdrawTo', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, { stateMutability: 'payable', type: 'receive' }];

let mempoolManager: MempoolManager;
let mockCacheService: ICacheService;
const entryPoint = new ethers.Contract('0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', entryPointAbi, new ethers.providers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com'));
let mockOptions: {
  mempoolFromCache?: string,
  chainId: number;
  entryPoint: ethers.Contract;
  mempoolConfig: {
    maxLength: number;
    minLength: number;
    maxUserOpPerSender: number;
    minMaxPriorityFeePerGasBumpPercentage: number;
    minMaxFeePerGasBumpPercentage: number;
  };
  nodePathIndex: number
};

describe('Mempool Manager', () => {
  it('markUserOpIncludedForBundling', () => {
    mockCacheService = {} as unknown as ICacheService;
    mockOptions = {
      mempoolFromCache: '[]',
      chainId: 80001,
      entryPoint,
      mempoolConfig: {
        maxLength: 5,
        minLength: 5,
        maxUserOpPerSender: 5,
        minMaxPriorityFeePerGasBumpPercentage: 5,
        minMaxFeePerGasBumpPercentage: 5,
      },
      nodePathIndex: 0,
    };
    mempoolManager = new MempoolManager({
      cacheService: mockCacheService,
      options: mockOptions,
    });
    mempoolManager.mempool = [
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash1',
        markedForBundling: false,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash2',
        markedForBundling: false,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash3',
        markedForBundling: false,
      },
    ];

    mempoolManager.markUserOpIncludedForBundling('mockUserOpHash3');
    expect(mempoolManager.mempool).toStrictEqual(
      [
        {
          userOp: {
            sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
          },
          userOpHash: 'mockUserOpHash1',
          markedForBundling: false,
        },
        {
          userOp: {
            sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
          },
          userOpHash: 'mockUserOpHash2',
          markedForBundling: false,
        },
        {
          userOp: {
            sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
          },
          userOpHash: 'mockUserOpHash3',
          markedForBundling: true,
        },
      ],
    );
  });

  it('unmarkUserOpIncludedForBundling', () => {
    mockCacheService = {} as unknown as ICacheService;
    mockOptions = {
      mempoolFromCache: '[]',
      chainId: 80001,
      entryPoint,
      mempoolConfig: {
        maxLength: 5,
        minLength: 5,
        maxUserOpPerSender: 5,
        minMaxPriorityFeePerGasBumpPercentage: 5,
        minMaxFeePerGasBumpPercentage: 5,
      },
      nodePathIndex: 0,
    };
    mempoolManager = new MempoolManager({
      cacheService: mockCacheService,
      options: mockOptions,
    });
    mempoolManager.mempool = [
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash1',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash2',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash3',
        markedForBundling: true,
      },
    ];

    mempoolManager.unmarkUserOpIncludedForBundling('mockUserOpHash3');
    expect(mempoolManager.mempool).toStrictEqual(
      [
        {
          userOp: {
            sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
          },
          userOpHash: 'mockUserOpHash1',
          markedForBundling: true,
        },
        {
          userOp: {
            sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
          },
          userOpHash: 'mockUserOpHash2',
          markedForBundling: true,
        },
        {
          userOp: {
            sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
          },
          userOpHash: 'mockUserOpHash3',
          markedForBundling: false,
        },
      ],
    );
  });

  it('countMempoolEntries', () => {
    mockCacheService = {} as unknown as ICacheService;
    mockOptions = {
      mempoolFromCache: '[]',
      chainId: 80001,
      entryPoint,
      mempoolConfig: {
        maxLength: 5,
        minLength: 5,
        maxUserOpPerSender: 5,
        minMaxPriorityFeePerGasBumpPercentage: 5,
        minMaxFeePerGasBumpPercentage: 5,
      },
      nodePathIndex: 0,
    };
    mempoolManager = new MempoolManager({
      cacheService: mockCacheService,
      options: mockOptions,
    });
    mempoolManager.mempool = [
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash1',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash2',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash3',
        markedForBundling: true,
      },
    ];

    const count = mempoolManager.countMempoolEntries();
    expect(count).toBe(3);
  });

  it('getMempoolEntries', () => {
    mockCacheService = {} as unknown as ICacheService;
    mockOptions = {
      mempoolFromCache: '[]',
      chainId: 80001,
      entryPoint,
      mempoolConfig: {
        maxLength: 5,
        minLength: 5,
        maxUserOpPerSender: 5,
        minMaxPriorityFeePerGasBumpPercentage: 5,
        minMaxFeePerGasBumpPercentage: 5,
      },
      nodePathIndex: 0,
    };
    mempoolManager = new MempoolManager({
      cacheService: mockCacheService,
      options: mockOptions,
    });
    mempoolManager.mempool = [
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash1',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash2',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash3',
        markedForBundling: true,
      },
    ];

    const enteries = mempoolManager.getMempoolEntries();
    expect(enteries).toStrictEqual([
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash1',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash2',
        markedForBundling: true,
      },
      {
        userOp: {
          sender: '0x6401ba7dac8fb0a083940b4876829e5e5f5edf8b', paymasterAndData: '0x', preVerificationGas: '46856', maxPriorityFeePerGas: '0', initCode: '0xb9c1891a00ce021aa4217f1bece761cbebcb20bd296601cd000000000000000000000000ab8e8b32d9edeede59f4a22a6641264f1e571b870000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000407df2db5444d2ee31a3c41df6732d9a2fa0d089118cbaf4afea65f80fcfa45d821b97ce40168d0286bebd2f9f3eb94a21464d77984e020de7a619f9374287cab5', verificationGasLimit: '5000000', signature: '0x248e90318c77489338ea7416d69280e82f8cd434a4fb825ea7938062a74fa9864d07b611ced5c5238763507c5d7b206ad239b7083c0ae2ad2608c2be2b59dab600000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000251a70842af8c1feb7133b81e6a160a6a2be45ee057f0eb6d3f7f5126daa202e071d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000025222c226f726967696e223a2268747470733a2f2f747275737477616c6c65742e636f6d227d000000000000000000000000000000000000000000000000000000', maxFeePerGas: '0', callGasLimit: '600000', callData: '0xb61d27f60000000000000000000000003c11f6265ddec22f4d049dde480615735f4516460000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000324049639fb0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000004b0f1812e5df2a09796481ff14017e60055080030000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddd00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000022812aa3caf000000000000000000000000170d2ed0b2a5d9f450652be814784f964749ffa4000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000004b0f1812e5df2a09796481ff14017e6005508003000000000000000000000000f7f21a56b19546a77eababf23d8dca726caf7577000000000000000000000000a7ca2c8673bcfa5a26d8ceec2887f2cc2b0db22a0000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000001621088b51a45ddc0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008500000000000000000000000000000000000000000000000000000000006700206ae4071138002dc6c0f7f21a56b19546a77eababf23d8dca726caf75771111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000001621088b51a45ddcbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0000000000000000000000000000000000000000000000000000000bd34b3600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', nonce: '0',
        },
        userOpHash: 'mockUserOpHash3',
        markedForBundling: true,
      },
    ]);
  });

  it('addUserOp: new sender', () => {

  });

  it('addUserOp: old sender & new nonce', () => {

  });

  it('addUserOp: old sender & old nonce with sufficient bumped up gas', () => {

  });

  it('addUserOp: old sender & old nonce without sufficient bumped up gas', () => {

  });

  it('removeUserOp: remove by userOpHash', () => {

  });

  it('removeUserOp: remove by userOp', () => {

  });
});
