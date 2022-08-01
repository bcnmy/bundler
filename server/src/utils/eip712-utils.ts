export const domainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

export const forwarderDomainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

export const forwardRequestType = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'txGas', type: 'uint256' },
  { name: 'tokenGasPrice', type: 'uint256' },
  { name: 'batchId', type: 'uint256' },
  { name: 'batchNonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];

export const daiPermitType = [
  { name: 'holder', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
];

export const eip2612PermitType = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];
