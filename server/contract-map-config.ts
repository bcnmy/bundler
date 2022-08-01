/* eslint-disable max-len */
export const biconomyForwarderAddressMap : Record<number, string> = {};
export const biconomyForwarderAddressesMap : Record<number, string[]> = {};
export const erc20ForwarderAddressMap : Record<number, string> = {};
export const oracleAggregatorAddressMap : Record<number, string> = {};
export const transferHandlerAddressMap : Record<number, string> = {};
export const daiTokenAddressMap : Record<number, string> = {};
export const usdtTokenAddressMap : Record<number, string> = {};
export const usdcTokenAddressMap : Record<number, string> = {};
export const sandTokenAddressMap : Record<number, string> = {};
export const biconomyForwarderAbiMap: Record<number, Array<object>> = {};
export const erc20ForwarderAbiMap: Record<number, Array<object>> = {};
export const erc20ForwarderV2AbiMap: Record<number, Array<object>> = {};
export const oracleAggregatorAbiMap: Record<number, Array<object>> = {};
export const transferHandlerAbiMap: Record<number, Array<object>> = {};
export const daiTokenAbiMap: Record<number, Array<object>> = {};
export const usdtTokenAbiMap: Record<number, Array<object>> = {};
export const sandTokenAbiMap: Record<number, Array<object>> = {};
export const usdcTokenAbiMap: Record<number, Array<object>> = {};
export const walletFactoryAddressMap: Record<number, string> = {};
export const baseWalletAddressMap: Record<number, string> = {};
export const entryPointAddressMap: Record<number, string> = {};
export const handlerAddressMap: Record<number, string> = {};

const biconomyForwarderAbi = [{ inputs: [{ internalType: 'address', name: '_owner', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32',
  }, {
    indexed: false, internalType: 'bytes', name: 'domainValue', type: 'bytes',
  }],
  name: 'DomainRegistered',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  inputs: [], name: 'EIP712_DOMAIN_TYPE', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'REQUEST_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], name: 'domains', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executeEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executePersonalSign',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'isOwner', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'string', name: 'name', type: 'string' }, { internalType: 'string', name: 'version', type: 'string' }], name: 'registerDomainSeparator', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'verifyEIP712',
  outputs: [],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'verifyPersonalSign',
  outputs: [],
  stateMutability: 'view',
  type: 'function',
}];
const erc20ForwarderAbi = [{ inputs: [{ internalType: 'address', name: '_owner', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint128', name: 'newBaseGas', type: 'uint128',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'BaseGasChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'from', type: 'address',
  }, {
    indexed: true, internalType: 'uint256', name: 'charge', type: 'uint256',
  }, {
    indexed: true, internalType: 'address', name: 'token', type: 'address',
  }],
  name: 'FeeCharged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint128', name: 'newGasRefund', type: 'uint128',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'GasRefundChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint128', name: 'newGasTokenForwarderBaseGas', type: 'uint128',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'GasTokenForwarderBaseGasChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newOracleAggregatorAddress', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'OracleAggregatorChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'tokenAddress', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }, {
    indexed: true, internalType: 'uint256', name: 'newGas', type: 'uint256',
  }],
  name: 'TransferHandlerGasChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newForwarderAddress', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'TrustedForwarderChanged',
  type: 'event',
}, {
  inputs: [], name: 'baseGas', outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executeEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, { internalType: 'uint256', name: 'gasTokensBurned', type: 'uint256' }],
  name: 'executeEIP712WithGasTokens',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executePersonalSign',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, { internalType: 'uint256', name: 'gasTokensBurned', type: 'uint256' }],
  name: 'executePersonalSignWithGasTokens',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [], name: 'feeManager', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'feeReceiver', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'forwarder', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'gasRefund', outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'gasTokenForwarderBaseGas', outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: 'nonce', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_feeReceiver', type: 'address' }, { internalType: 'address', name: '_feeManager', type: 'address' }, { internalType: 'address payable', name: '_forwarder', type: 'address' }], name: 'initialize', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'isOwner', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'oracleAggregator', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'struct ERC20ForwardRequestTypes.PermitRequest', name: 'permitOptions', type: 'tuple',
  }],
  name: 'permitAndExecuteEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'struct ERC20ForwardRequestTypes.PermitRequest', name: 'permitOptions', type: 'tuple',
  }, { internalType: 'uint256', name: 'gasTokensBurned', type: 'uint256' }],
  name: 'permitAndExecuteEIP712WithGasTokens',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'struct ERC20ForwardRequestTypes.PermitRequest', name: 'permitOptions', type: 'tuple',
  }],
  name: 'permitEIP2612AndExecuteEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'struct ERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'struct ERC20ForwardRequestTypes.PermitRequest', name: 'permitOptions', type: 'tuple',
  }, { internalType: 'uint256', name: 'gasTokensBurned', type: 'uint256' }],
  name: 'permitEIP2612AndExecuteEIP712WithGasTokens',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'safeTransferRequired', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint128', name: 'gas', type: 'uint128' }], name: 'setBaseGas', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_feeManager', type: 'address' }], name: 'setFeeManager', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_feeReceiver', type: 'address' }], name: 'setFeeReceiver', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'uint128', name: 'refund', type: 'uint128' }], name: 'setGasRefund', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'uint128', name: 'gas', type: 'uint128' }], name: 'setGasTokenForwarderBaseGas', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'oa', type: 'address' }], name: 'setOracleAggregator', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'bool', name: '_safeTransferRequired', type: 'bool' }], name: 'setSafeTransferRequired', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: '_transferHandlerGas', type: 'uint256' }], name: 'setTransferHandlerGas', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address payable', name: '_forwarder', type: 'address' }], name: 'setTrustedForwarder', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'transferHandlerGas', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}];
const erc20ForwarderV2Abi = [{
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint128', name: 'newBaseGas', type: 'uint128',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'BaseGasChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'from', type: 'address',
  }, {
    indexed: true, internalType: 'uint256', name: 'charge', type: 'uint256',
  }, {
    indexed: true, internalType: 'address', name: 'token', type: 'address',
  }],
  name: 'FeeCharged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newFeeManager', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'FeeManagerChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newFeeReceiver', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'FeeReceiverChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newOracleAggregatorAddress', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'OracleAggregatorChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint16', name: 'newPct', type: 'uint16',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'TokenGasPriceThresholdChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'tokenAddress', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }, {
    indexed: true, internalType: 'uint256', name: 'newGas', type: 'uint256',
  }],
  name: 'TransferHandlerGasChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newForwarderAddress', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'actor', type: 'address',
  }],
  name: 'TrustedForwarderChanged',
  type: 'event',
}, {
  inputs: [], name: 'TOKEN_GAS_PRICE_THRESHOLD_PERCENTAGE', outputs: [{ internalType: 'uint16', name: '', type: 'uint16' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'baseGas', outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executeEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'string', name: 'warning', type: 'string' }, { internalType: 'string', name: 'info', type: 'string' }, { internalType: 'string', name: 'action', type: 'string' }, {
      components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'request', type: 'tuple',
    }],
    internalType: 'structForwardRequestTypesV2.CustomForwardRequest',
    name: 'req',
    type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executeEIP712Custom',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executePersonalSign',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [], name: 'feeManager', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'feeReceiver', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'forwarder', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: 'nonce', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_feeReceiver', type: 'address' }, { internalType: 'address', name: '_feeManager', type: 'address' }, { internalType: 'addresspayable', name: '_forwarder', type: 'address' }], name: 'initialize', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'oracleAggregator', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'structForwardRequestTypesV2.PermitRequest', name: 'permitOptions', type: 'tuple',
  }],
  name: 'permitAndExecuteEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'string', name: 'warning', type: 'string' }, { internalType: 'string', name: 'info', type: 'string' }, { internalType: 'string', name: 'action', type: 'string' }, {
      components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'request', type: 'tuple',
    }],
    internalType: 'structForwardRequestTypesV2.CustomForwardRequest',
    name: 'req',
    type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'structForwardRequestTypesV2.PermitRequest', name: 'permitOptions', type: 'tuple',
  }],
  name: 'permitAndExecuteEIP712Custom',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'structForwardRequestTypesV2.PermitRequest', name: 'permitOptions', type: 'tuple',
  }],
  name: 'permitEIP2612AndExecuteEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'string', name: 'warning', type: 'string' }, { internalType: 'string', name: 'info', type: 'string' }, { internalType: 'string', name: 'action', type: 'string' }, {
      components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structForwardRequestTypesV2.ERC20ForwardRequest', name: 'request', type: 'tuple',
    }],
    internalType: 'structForwardRequestTypesV2.CustomForwardRequest',
    name: 'req',
    type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }, {
    components: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], internalType: 'structForwardRequestTypesV2.PermitRequest', name: 'permitOptions', type: 'tuple',
  }],
  name: 'permitEIP2612AndExecuteEIP712Custom',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'safeTransferRequired', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint128', name: 'gas', type: 'uint128' }], name: 'setBaseGas', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_feeManager', type: 'address' }], name: 'setFeeManager', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_feeReceiver', type: 'address' }], name: 'setFeeReceiver', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'oa', type: 'address' }], name: 'setOracleAggregator', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'bool', name: '_safeTransferRequired', type: 'bool' }], name: 'setSafeTransferRequired', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'uint16', name: 'newPct', type: 'uint16' }], name: 'setTokenGasPriceThreshold', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: '_transferHandlerGas', type: 'uint256' }], name: 'setTransferHandlerGas', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'addresspayable', name: '_forwarder', type: 'address' }], name: 'setTrustedForwarder', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'transferHandlerGas', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}];
const oracleAggregatorAbi = [{ inputs: [{ internalType: 'address', name: '_owner', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'getTokenOracleDecimals', outputs: [{ internalType: 'uint8', name: '_tokenOracleDecimals', type: 'uint8' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'getTokenPrice', outputs: [{ internalType: 'uint256', name: 'tokenPriceUnadjusted', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'isOwner', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'address', name: 'callAddress', type: 'address' }, { internalType: 'uint8', name: 'decimals', type: 'uint8' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'bool', name: 'signed', type: 'bool' }], name: 'setTokenOracle', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}];
const transferHandlerAbi = [{ inputs: [{ internalType: 'address', name: '_forwarder', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  inputs: [{ internalType: 'address', name: 'forwarder', type: 'address' }], name: 'isTrustedForwarder', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'transfer', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'trustedForwarder', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'versionRecipient', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}];
const daiTokenAbi = [{
  inputs: [{ internalType: 'uint256', name: 'chainId_', type: 'uint256' }], payable: false, stateMutability: 'nonpayable', type: 'constructor',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'src', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'guy', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'wad', type: 'uint256',
  }],
  name: 'Approval',
  type: 'event',
}, {
  anonymous: true,
  inputs: [{
    indexed: true, internalType: 'bytes4', name: 'sig', type: 'bytes4',
  }, {
    indexed: true, internalType: 'address', name: 'usr', type: 'address',
  }, {
    indexed: true, internalType: 'bytes32', name: 'arg1', type: 'bytes32',
  }, {
    indexed: true, internalType: 'bytes32', name: 'arg2', type: 'bytes32',
  }, {
    indexed: false, internalType: 'bytes', name: 'data', type: 'bytes',
  }],
  name: 'LogNote',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'src', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'dst', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'wad', type: 'uint256',
  }],
  name: 'Transfer',
  type: 'event',
}, {
  constant: true, inputs: [], name: 'DOMAIN_SEPARATOR', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'PERMIT_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ internalType: 'address', name: '', type: 'address' }, { internalType: 'address', name: '', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'usr', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'usr', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'burn', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'guy', type: 'address' }], name: 'deny', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'usr', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'mint', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'src', type: 'address' }, { internalType: 'address', name: 'dst', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'move', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'nonces', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'holder', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'uint256', name: 'expiry', type: 'uint256' }, { internalType: 'bool', name: 'allowed', type: 'bool' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], name: 'permit', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'usr', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'pull', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'usr', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'push', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'guy', type: 'address' }], name: 'rely', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'totalSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'dst', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'transfer', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ internalType: 'address', name: 'src', type: 'address' }, { internalType: 'address', name: 'dst', type: 'address' }, { internalType: 'uint256', name: 'wad', type: 'uint256' }], name: 'transferFrom', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'version', outputs: [{ internalType: 'string', name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'wards', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}];
const usdtTokenAbi = [{
  constant: true, inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_upgradedAddress', type: 'address' }], name: 'deprecate', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'deprecated', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_evilUser', type: 'address' }], name: 'addBlackList', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_from', type: 'address' }, { name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'transferFrom', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'upgradedAddress', outputs: [{ name: '', type: 'address' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ name: '', type: 'address' }], name: 'balances', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'maximumFee', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: '_totalSupply', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [], name: 'unpause', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [{ name: '_maker', type: 'address' }], name: 'getBlackListStatus', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], name: 'allowed', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'paused', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ name: 'who', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [], name: 'pause', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'getOwner', outputs: [{ name: '', type: 'address' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'owner', outputs: [{ name: '', type: 'address' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'transfer', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ name: 'newBasisPoints', type: 'uint256' }, { name: 'newMaxFee', type: 'uint256' }], name: 'setParams', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ name: 'amount', type: 'uint256' }], name: 'issue', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ name: 'amount', type: 'uint256' }], name: 'redeem', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }], name: 'allowance', outputs: [{ name: 'remaining', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'basisPointsRate', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ name: '', type: 'address' }], name: 'isBlackListed', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_clearedUser', type: 'address' }], name: 'removeBlackList', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'MAX_UINT', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: false, inputs: [{ name: '_blackListedUser', type: 'address' }], name: 'destroyBlackFunds', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ name: '_initialSupply', type: 'uint256' }, { name: '_name', type: 'string' }, { name: '_symbol', type: 'string' }, { name: '_decimals', type: 'uint256' }], payable: false, stateMutability: 'nonpayable', type: 'constructor',
}, {
  anonymous: false, inputs: [{ indexed: false, name: 'amount', type: 'uint256' }], name: 'Issue', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: false, name: 'amount', type: 'uint256' }], name: 'Redeem', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: false, name: 'newAddress', type: 'address' }], name: 'Deprecate', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: false, name: 'feeBasisPoints', type: 'uint256' }, { indexed: false, name: 'maxFee', type: 'uint256' }], name: 'Params', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: false, name: '_blackListedUser', type: 'address' }, { indexed: false, name: '_balance', type: 'uint256' }], name: 'DestroyedBlackFunds', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: false, name: '_user', type: 'address' }], name: 'AddedBlackList', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: false, name: '_user', type: 'address' }], name: 'RemovedBlackList', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: true, name: 'owner', type: 'address' }, { indexed: true, name: 'spender', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Approval', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event',
}, {
  anonymous: false, inputs: [], name: 'Pause', type: 'event',
}, {
  anonymous: false, inputs: [], name: 'Unpause', type: 'event',
}];
const sandTokenAbi = [{ inputs: [{ internalType: 'address', name: '_childChainManagerProxy', type: 'address' }, { internalType: 'address', name: 'trustedForwarder', type: 'address' }, { internalType: 'address', name: 'sandAdmin', type: 'address' }, { internalType: 'address', name: 'executionAdmin', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'oldAdmin', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'newAdmin', type: 'address',
  }],
  name: 'AdminChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'owner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'spender', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'value', type: 'uint256',
  }],
  name: 'Approval',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'superOperator', type: 'address',
  }, {
    indexed: false, internalType: 'bool', name: 'enabled', type: 'bool',
  }],
  name: 'SuperOperator',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'from', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'to', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'value', type: 'uint256',
  }],
  name: 'Transfer',
  type: 'event',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amountNeeded', type: 'uint256' }], name: 'addAllowanceIfNeeded', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: 'remaining', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'target', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], name: 'approveAndCall', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'payable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approveFor', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'burn', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'burnFor', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newAdmin', type: 'address' }], name: 'changeAdmin', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'childChainManagerProxy', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], stateMutability: 'pure', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'user', type: 'address' }, { internalType: 'bytes', name: 'depositData', type: 'bytes' }], name: 'deposit', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'getAdmin', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'getTrustedForwarder', outputs: [{ internalType: 'address', name: 'trustedForwarder', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'who', type: 'address' }], name: 'isSuperOperator', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'forwarder', type: 'address' }], name: 'isTrustedForwarder', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'target', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], name: 'paidCall', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'payable', type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'superOperator', type: 'address' }, { internalType: 'bool', name: 'enabled', type: 'bool' }], name: 'setSuperOperator', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'trustedForwarder', type: 'address' }], name: 'setTrustedForwarder', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'totalSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'transfer', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'transferFrom', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newChildChainManagerProxy', type: 'address' }], name: 'updateChildChainManager', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function',
}];
const usdcTokenAbi = [{ inputs: [{ internalType: 'string', name: 'name', type: 'string' }, { internalType: 'string', name: 'symbol', type: 'string' }, { internalType: 'uint256', name: 'initialBalance', type: 'uint256' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'owner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'spender', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'value', type: 'uint256',
  }],
  name: 'Approval',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'authorizer', type: 'address',
  }, {
    indexed: true, internalType: 'bytes32', name: 'nonce', type: 'bytes32',
  }],
  name: 'AuthorizationCanceled',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'authorizer', type: 'address',
  }, {
    indexed: true, internalType: 'bytes32', name: 'nonce', type: 'bytes32',
  }],
  name: 'AuthorizationUsed',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: '_account', type: 'address',
  }],
  name: 'Blacklisted',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newBlacklister', type: 'address',
  }],
  name: 'BlacklisterChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'burner', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256',
  }],
  name: 'Burn',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newMasterMinter', type: 'address',
  }],
  name: 'MasterMinterChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'minter', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'to', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256',
  }],
  name: 'Mint',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'minter', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'minterAllowedAmount', type: 'uint256',
  }],
  name: 'MinterConfigured',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'oldMinter', type: 'address',
  }],
  name: 'MinterRemoved',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  anonymous: false, inputs: [], name: 'Pause', type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newAddress', type: 'address',
  }],
  name: 'PauserChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'newRescuer', type: 'address',
  }],
  name: 'RescuerChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'from', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'to', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'value', type: 'uint256',
  }],
  name: 'Transfer',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: '_account', type: 'address',
  }],
  name: 'UnBlacklisted',
  type: 'event',
}, {
  anonymous: false, inputs: [], name: 'Unpause', type: 'event',
}, {
  inputs: [], name: 'APPROVE_WITH_AUTHORIZATION_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'CANCEL_AUTHORIZATION_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'DECREASE_ALLOWANCE_WITH_AUTHORIZATION_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'DOMAIN_SEPARATOR', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'INCREASE_ALLOWANCE_WITH_AUTHORIZATION_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'PERMIT_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'TRANSFER_WITH_AUTHORIZATION_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'validAfter', type: 'uint256' }, { internalType: 'uint256', name: 'validBefore', type: 'uint256' }, { internalType: 'bytes32', name: 'nonce', type: 'bytes32' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], name: 'approveWithAuthorization', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'authorizer', type: 'address' }, { internalType: 'bytes32', name: 'nonce', type: 'bytes32' }], name: 'authorizationState', outputs: [{ internalType: 'enumGasAbstraction.AuthorizationState', name: '', type: 'uint8' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_account', type: 'address' }], name: 'blacklist', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'blacklister', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }], name: 'burn', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'authorizer', type: 'address' }, { internalType: 'bytes32', name: 'nonce', type: 'bytes32' },
    { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }],
  name: 'cancelAuthorization',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'minter', type: 'address' }, { internalType: 'uint256', name: 'minterAllowedAmount', type: 'uint256' }], name: 'configureMinter', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'currency', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'decrement', type: 'uint256' }], name: 'decreaseAllowance', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'decrement', type: 'uint256' }, { internalType: 'uint256', name: 'validAfter', type: 'uint256' }, { internalType: 'uint256', name: 'validBefore', type: 'uint256' }, { internalType: 'bytes32', name: 'nonce', type: 'bytes32' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], name: 'decreaseAllowanceWithAuthorization', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'increment', type: 'uint256' }], name: 'increaseAllowance', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'increment', type: 'uint256' }, { internalType: 'uint256', name: 'validAfter', type: 'uint256' }, { internalType: 'uint256', name: 'validBefore', type: 'uint256' }, { internalType: 'bytes32', name: 'nonce', type: 'bytes32' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], name: 'increaseAllowanceWithAuthorization', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'string', name: 'tokenName', type: 'string' }, { internalType: 'string', name: 'tokenSymbol', type: 'string' }, { internalType: 'string', name: 'tokenCurrency', type: 'string' }, { internalType: 'uint8', name: 'tokenDecimals', type: 'uint8' }, { internalType: 'address', name: 'newMasterMinter', type: 'address' }, { internalType: 'address', name: 'newPauser', type: 'address' }, { internalType: 'address', name: 'newBlacklister', type: 'address' }, { internalType: 'address', name: 'newOwner', type: 'address' }], name: 'initialize', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'string', name: 'newName', type: 'string' }], name: 'initializeV2', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_account', type: 'address' }], name: 'isBlacklisted', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'isMinter', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'masterMinter', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_to', type: 'address' }, { internalType: 'uint256', name: '_amount', type: 'uint256' }], name: 'mint', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'minter', type: 'address' }], name: 'minterAllowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }], name: 'nonces', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'paused', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'pauser', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], name: 'permit', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'minter', type: 'address' }], name: 'removeMinter', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'contractIERC20', name: 'tokenContract', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'rescueERC20', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'rescuer', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'totalSupply', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }], name: 'transfer', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }], name: 'transferFrom', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
},
{
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'uint256', name: 'validAfter', type: 'uint256' }, { internalType: 'uint256', name: 'validBefore', type: 'uint256' }, { internalType: 'bytes32', name: 'nonce', type: 'bytes32' }, { internalType: 'uint8', name: 'v', type: 'uint8' }, { internalType: 'bytes32', name: 'r', type: 'bytes32' }, { internalType: 'bytes32', name: 's', type: 'bytes32' }], name: 'transferWithAuthorization', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_account', type: 'address' }], name: 'unBlacklist', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_newBlacklister', type: 'address' }], name: 'updateBlacklister', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_newMasterMinter', type: 'address' }], name: 'updateMasterMinter', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_newPauser', type: 'address' }], name: 'updatePauser', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newRescuer', type: 'address' }], name: 'updateRescuer', outputs: [], stateMutability: 'nonpayable', type: 'function',
}];

biconomyForwarderAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
biconomyForwarderAddressesMap[42] = process.env.BICONOMY_FORWARDER_ADDRESSES_KOVAN ? process.env.BICONOMY_FORWARDER_ADDRESSES_KOVAN.split(',') : [];
erc20ForwarderAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
oracleAggregatorAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
transferHandlerAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
daiTokenAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
usdtTokenAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
usdcTokenAddressMap[42] = process.env.BICONOMY_FORWARDER_ADDRESS_KOVAN || '';
biconomyForwarderAbiMap[42] = biconomyForwarderAbi;
erc20ForwarderAbiMap[42] = erc20ForwarderAbi;
oracleAggregatorAbiMap[42] = oracleAggregatorAbi;
transferHandlerAbiMap[42] = transferHandlerAbi;
daiTokenAbiMap[42] = daiTokenAbi;
usdtTokenAbiMap[42] = usdtTokenAbi;
usdcTokenAbiMap[42] = usdcTokenAbi;

biconomyForwarderAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
biconomyForwarderAddressesMap[4] = process.env.BICONOMY_FORWARDER_ADDRESSES_RINKEBY ? process.env.BICONOMY_FORWARDER_ADDRESSES_RINKEBY.split(',') : [];
erc20ForwarderAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
oracleAggregatorAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
transferHandlerAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
daiTokenAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
usdtTokenAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
usdcTokenAddressMap[4] = process.env.BICONOMY_FORWARDER_ADDRESS_RINKEBY || '';
biconomyForwarderAbiMap[4] = biconomyForwarderAbi;
erc20ForwarderAbiMap[4] = erc20ForwarderAbi;
oracleAggregatorAbiMap[4] = oracleAggregatorAbi;
transferHandlerAbiMap[4] = transferHandlerAbi;
daiTokenAbiMap[4] = daiTokenAbi;
usdtTokenAbiMap[4] = usdtTokenAbi;
usdcTokenAbiMap[4] = usdcTokenAbi;
walletFactoryAddressMap[4] = process.env.BICONOMY_WALLET_FACTORY_ADDRESS_RINKEBY || '';
baseWalletAddressMap[4] = process.env.BICONOMY_BASE_WALLET_ADDRESS_RINKEBY || '';
entryPointAddressMap[4] = process.env.BICONOMY_ENTRY_POINT_ADDRESS_RINKEBY || '';
handlerAddressMap[4] = process.env.BICONOMY_DEFAULT_CALLBACK_HANDLER_ADDRESS_RINKEBY || '';

biconomyForwarderAddressMap[3] = process.env.BICONOMY_FORWARDER_ADDRESS_ROPSTEN || '';
biconomyForwarderAddressesMap[3] = process.env.BICONOMY_FORWARDER_ADDRESSES_ROPSTEN ? process.env.BICONOMY_FORWARDER_ADDRESSES_ROPSTEN.split(',') : [];
biconomyForwarderAbiMap[3] = biconomyForwarderAbi;

biconomyForwarderAddressMap[5] = process.env.BICONOMY_FORWARDER_ADDRESS_GOERLI || '';
biconomyForwarderAddressesMap[5] = process.env.BICONOMY_FORWARDER_ADDRESSES_GOERLI ? process.env.BICONOMY_FORWARDER_ADDRESSES_GOERLI.split(',') : [];
biconomyForwarderAbiMap[5] = biconomyForwarderAbi;
walletFactoryAddressMap[5] = process.env.BICONOMY_WALLET_FACTORY_ADDRESS_GOERLI || '';
baseWalletAddressMap[5] = process.env.BICONOMY_BASE_WALLET_ADDRESS_GOERLI || '';
entryPointAddressMap[5] = process.env.BICONOMY_ENTRY_POINT_ADDRESS_GOERLI || '';
handlerAddressMap[5] = process.env.BICONOMY_DEFAULT_CALLBACK_HANDLER_ADDRESS_GOERLI || '';

biconomyForwarderAddressMap[80001] = process.env.BICONOMY_FORWARDER_ADDRESS_MUMBAI || '';
biconomyForwarderAddressesMap[80001] = process.env.BICONOMY_FORWARDER_ADDRESSES_MUMBAI ? process.env.BICONOMY_FORWARDER_ADDRESSES_MUMBAI.split(',') : [];
erc20ForwarderAddressMap[80001] = process.env.ERC20_FORWARDER_ADDRESS_MUMBAI || '';
oracleAggregatorAddressMap[80001] = process.env.ORACLE_AGGREGATOR_ADDRESS_MUMBAI || '';
transferHandlerAddressMap[80001] = process.env.TRANSFER_HANDLER_ADDRESS_MUMBAI || '';
daiTokenAddressMap[80001] = process.env.DAI_TOKEN_ADDRESS_MUMBAI || '';
usdcTokenAddressMap[80001] = process.env.USDC_TOKEN_ADDRESS_MUMBAI || '';
usdtTokenAddressMap[80001] = process.env.USDT_TOKEN_ADDRESS_MUMBAI || '';
sandTokenAddressMap[80001] = process.env.SAND_TOKEN_ADDRESS_MUMBAI || '';
biconomyForwarderAbiMap[80001] = biconomyForwarderAbi;
erc20ForwarderV2AbiMap[80001] = erc20ForwarderV2Abi;
oracleAggregatorAbiMap[80001] = oracleAggregatorAbi;
transferHandlerAbiMap[80001] = transferHandlerAbi;
daiTokenAbiMap[80001] = daiTokenAbi;
usdtTokenAbiMap[80001] = usdtTokenAbi;
usdcTokenAbiMap[80001] = usdcTokenAbi;
sandTokenAbiMap[80001] = sandTokenAbi;
walletFactoryAddressMap[80001] = process.env.BICONOMY_WALLET_FACTORY_ADDRESS_MUMBAI || '';
baseWalletAddressMap[80001] = process.env.BICONOMY_BASE_WALLET_ADDRESS_MUMBAI || '';
entryPointAddressMap[80001] = process.env.BICONOMY_ENTRY_POINT_ADDRESS_MUMBAI || '';
handlerAddressMap[80001] = process.env.BICONOMY_DEFAULT_CALLBACK_HANDLER_ADDRESS_MUMBAI || '';

biconomyForwarderAddressMap[1] = process.env.BICONOMY_FORWARDER_ADDRESS_ETHEREUM_MAINNET || '';
biconomyForwarderAddressesMap[1] = process.env.BICONOMY_FORWARDER_ADDRESSES_ETHEREUM_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_ETHEREUM_MAINNET.split(',') : [];
erc20ForwarderAddressMap[1] = process.env.ERC20_FORWARDER_ADDRESS_ETHEREUM_MAINNET || '';
oracleAggregatorAddressMap[1] = process.env.ORACLE_AGGREGATOR_ADDRESS_ETHEREUM_MAINNET || '';
transferHandlerAddressMap[1] = process.env.TRANSFER_HANDLER_ADDRESS_ETHEREUM_MAINNET || '';
daiTokenAddressMap[1] = process.env.DAI_TOKEN_ADDRESS_ETHEREUM_MAINNET || '';
usdtTokenAddressMap[1] = process.env.USDT_TOKEN_ADDRESS_ETHEREUM_MAINNET || '';
usdcTokenAddressMap[1] = process.env.USDC_TOKEN_ADDRESS_ETHEREUM_MAINNET || '';
biconomyForwarderAbiMap[1] = biconomyForwarderAbi;
erc20ForwarderAbiMap[1] = erc20ForwarderAbi;
oracleAggregatorAbiMap[1] = oracleAggregatorAbi;
transferHandlerAbiMap[1] = transferHandlerAbi;
daiTokenAbiMap[1] = daiTokenAbi;
usdtTokenAbiMap[1] = usdtTokenAbi;

biconomyForwarderAddressMap[137] = process.env.BICONOMY_FORWARDER_ADDRESS_POLYGON_MAINNET || '';
biconomyForwarderAddressesMap[137] = process.env.BICONOMY_FORWARDER_ADDRESSES_POLYGON_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_POLYGON_MAINNET.split(',') : [];
erc20ForwarderAddressMap[137] = process.env.ERC20_FORWARDER_ADDRESS_POLYGON_MAINNET || '';
oracleAggregatorAddressMap[137] = process.env.ORACLE_AGGREGATOR_ADDRESS_POLYGON_MAINNET || '';
transferHandlerAddressMap[137] = process.env.TRANSFER_HANDLER_ADDRESS_POLYGON_MAINNET || '';
daiTokenAddressMap[137] = process.env.DAI_TOKEN_ADDRESS_POLYGON_MAINNET || '';
usdtTokenAddressMap[137] = process.env.USDT_TOKEN_ADDRESS_POLYGON_MAINNET || '';
usdcTokenAddressMap[137] = process.env.USDT_TOKEN_ADDRESS_POLYGON_MAINNET || '';
sandTokenAddressMap[137] = process.env.SAND_TOKEN_ADDRESS_POLYGON || '';
biconomyForwarderAbiMap[137] = biconomyForwarderAbi;
erc20ForwarderV2AbiMap[137] = erc20ForwarderV2Abi;
oracleAggregatorAbiMap[137] = oracleAggregatorAbi;
transferHandlerAbiMap[137] = transferHandlerAbi;
daiTokenAbiMap[137] = daiTokenAbi;
usdtTokenAbiMap[137] = usdtTokenAbi;
sandTokenAbiMap[137] = sandTokenAbi;
usdcTokenAbiMap[137] = usdcTokenAbi;
walletFactoryAddressMap[137] = process.env.BICONOMY_WALLET_FACTORY_ADDRESS_POLYGON_MAINNET || '';
baseWalletAddressMap[137] = process.env.BICONOMY_BASE_WALLET_ADDRESS_POLYGON_MAINNET || '';
entryPointAddressMap[137] = process.env.BICONOMY_ENTRY_POINT_ADDRESS_POLYGON_MAINNET || '';
handlerAddressMap[137] = process.env.BICONOMY_DEFAULT_CALLBACK_HANDLER_ADDRESS_POLYGON_MAINNET || '';

biconomyForwarderAddressMap[100] = process.env.BICONOMY_FORWARDER_ADDRESS_XDAI_MAINNET || '';
biconomyForwarderAddressesMap[100] = process.env.BICONOMY_FORWARDER_ADDRESSES_XDAI_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_XDAI_MAINNET.split(',') : [];
biconomyForwarderAbiMap[100] = biconomyForwarderAbi;

// Binance testnet
biconomyForwarderAddressMap[97] = process.env.BICONOMY_FORWARDER_ADDRESS_BINANCE_TEST || '';
biconomyForwarderAddressesMap[97] = process.env.BICONOMY_FORWARDER_ADDRESSES_BINANCE_TEST ? process.env.BICONOMY_FORWARDER_ADDRESSES_BINANCE_TEST.split(',') : [];
biconomyForwarderAbiMap[97] = biconomyForwarderAbi;

// Moonbeam testnet
biconomyForwarderAddressMap[1287] = process.env.BICONOMY_FORWARDER_ADDRESS_MOONBEAM_TEST || '';
biconomyForwarderAddressesMap[1287] = process.env.BICONOMY_FORWARDER_ADDRESSES_MOONBEAM_TEST ? process.env.BICONOMY_FORWARDER_ADDRESSES_MOONBEAM_TEST.split(',') : [];
biconomyForwarderAbiMap[1287] = biconomyForwarderAbi;

// Moonbeam mainnet
biconomyForwarderAddressMap[1284] = process.env.BICONOMY_FORWARDER_ADDRESS_MOONBEAM_MAINNET || '';
biconomyForwarderAddressesMap[1284] = process.env.BICONOMY_FORWARDER_ADDRESSES_MOONBEAM_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_MOONBEAM_MAINNET.split(',') : [];
biconomyForwarderAbiMap[1284] = biconomyForwarderAbi;

// Moonriver mainnet
biconomyForwarderAddressMap[1285] = process.env.BICONOMY_FORWARDER_ADDRESS_MOONRIVER_MAINNET || '';
biconomyForwarderAddressesMap[1285] = process.env.BICONOMY_FORWARDER_ADDRESSES_MOONRIVER_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_MOONRIVER_MAINNET.split(',') : [];
biconomyForwarderAbiMap[1285] = biconomyForwarderAbi;

// Binance Mainnet
biconomyForwarderAddressMap[56] = process.env.BICONOMY_FORWARDER_ADDRESS_BINANCE_MAINNET || '';
biconomyForwarderAddressesMap[56] = process.env.BICONOMY_FORWARDER_ADDRESSES_BINANCE_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_BINANCE_MAINNET.split(',') : [];
biconomyForwarderAbiMap[56] = biconomyForwarderAbi;

// Edgeware Mainnet
biconomyForwarderAddressMap[2021] = process.env.BICONOMY_FORWARDER_ADDRESS_EDGEWARE_MAINNET || '';
biconomyForwarderAddressesMap[2021] = process.env.BICONOMY_FORWARDER_ADDRESSES_EDGEWARE_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_EDGEWARE_MAINNET.split(',') : [];
biconomyForwarderAbiMap[2021] = biconomyForwarderAbi;

// Arbitrum Testnet
biconomyForwarderAddressMap[421611] = process.env.BICONOMY_FORWARDER_ADDRESS_ARBITRUM_TEST || '';
biconomyForwarderAddressesMap[421611] = process.env.BICONOMY_FORWARDER_ADDRESSES_ARBITRUM_TEST ? process.env.BICONOMY_FORWARDER_ADDRESSES_ARBITRUM_TEST.split(',') : [];
biconomyForwarderAbiMap[421611] = biconomyForwarderAbi;

// Arbitrum Mainnet
biconomyForwarderAddressMap[42161] = process.env.BICONOMY_FORWARDER_ADDRESS_ARBITRUM_MAINNET || '';
biconomyForwarderAddressesMap[42161] = process.env.BICONOMY_FORWARDER_ADDRESSES_ARBITRUM_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_ARBITRUM_MAINNET.split(',') : [];
biconomyForwarderAbiMap[42161] = biconomyForwarderAbi;

// Avalanche Testnet
biconomyForwarderAddressMap[43113] = process.env.BICONOMY_FORWARDER_ADDRESS_AVALANCHE_TEST || '';
biconomyForwarderAddressesMap[43113] = process.env.BICONOMY_FORWARDER_ADDRESSES_AVALANCHE_TEST ? process.env.BICONOMY_FORWARDER_ADDRESSES_AVALANCHE_TEST.split(',') : [];
biconomyForwarderAbiMap[43113] = biconomyForwarderAbi;

// Avalanche C Chain Mainnet
biconomyForwarderAddressMap[43114] = process.env.BICONOMY_FORWARDER_ADDRESS_AVALANCHE_MAINNET || '';
biconomyForwarderAddressesMap[43114] = process.env.BICONOMY_FORWARDER_ADDRESSES_AVALANCHE_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_AVALANCHE_MAINNET.split(',') : [];
biconomyForwarderAbiMap[43114] = biconomyForwarderAbi;

// Fantom Mainnet
biconomyForwarderAddressMap[250] = process.env.BICONOMY_FORWARDER_ADDRESS_FANTOM_MAINNET || '';
biconomyForwarderAddressesMap[250] = process.env.BICONOMY_FORWARDER_ADDRESSES_FANTOM_MAINNET ? process.env.BICONOMY_FORWARDER_ADDRESSES_FANTOM_MAINNET.split(',') : [];
biconomyForwarderAbiMap[250] = biconomyForwarderAbi;

// Fantom Testnet
biconomyForwarderAddressMap[4002] = process.env.BICONOMY_FORWARDER_ADDRESS_FANTOM_TEST || '';
biconomyForwarderAddressesMap[4002] = process.env.BICONOMY_FORWARDER_ADDRESSES_FANTOM_TEST ? process.env.BICONOMY_FORWARDER_ADDRESSES_FANTOM_TEST.split(',') : [];
biconomyForwarderAbiMap[4002] = biconomyForwarderAbi;
