export const ERC20_ABI = [{
  constant: true, inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_from', type: 'address' }, { name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'transferFrom', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [{ name: '_owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: 'balance', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function',
}, {
  constant: false, inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'transfer', outputs: [{ name: '', type: 'bool' }], payable: false, stateMutability: 'nonpayable', type: 'function',
}, {
  constant: true, inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], payable: false, stateMutability: 'view', type: 'function',
}, { payable: true, stateMutability: 'payable', type: 'fallback' }, {
  anonymous: false, inputs: [{ indexed: true, name: 'owner', type: 'address' }, { indexed: true, name: 'spender', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Approval', type: 'event',
}, {
  anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event',
}];

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
  LINEA_MAINET = 59144,
  GANACHE = 1337,
}

// Network with base gas diff from 21k and maxPriorityFeePerGas is 0
export const L2Networks = [421613, 42161, 42170];
export const PolygonZKEvmNetworks = [1101, 1442];
export const OptimismNetworks = [420, 10, 84531, 8453, 204, 5611];
export const LineaNetworks = [59140, 59144];
export const ArbitrumNetworks = [42170, 421613, 42161];
export const AlchemySimulateExecutionSupportedNetworks = [
  1, 5, 137, 80001, 10, 420, 42161, 421613, 8453, 84531,
];
