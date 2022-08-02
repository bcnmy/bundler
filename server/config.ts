import {
  biconomyForwarderAddressMap,
  biconomyForwarderAddressesMap,
  erc20ForwarderAddressMap,
  oracleAggregatorAddressMap,
  transferHandlerAddressMap,
  daiTokenAddressMap,
  usdtTokenAddressMap,
  usdcTokenAddressMap,
  sandTokenAddressMap,
  biconomyForwarderAbiMap,
  erc20ForwarderAbiMap,
  erc20ForwarderV2AbiMap,
  oracleAggregatorAbiMap,
  transferHandlerAbiMap,
  daiTokenAbiMap,
  usdtTokenAbiMap,
  sandTokenAbiMap,
  usdcTokenAbiMap,
  walletFactoryAddressMap,
  baseWalletAddressMap,
  entryPointAddressMap,
  handlerAddressMap,
} from './contract-map-config';

interface LooseObject {
  [key: string]: any
}

// eslint-disable-next-line import/no-mutable-exports
let config: LooseObject = {};

// const transaction_handler_config: LooseObject = {}; // Read from file and assign
// Define config for all services and export
// Read from file/redis + process.env

const envConfig: LooseObject = {
  native: {
    '/api/v2/meta-tx/custom': ['1', '100', '137'],
    '/api/v2/meta-tx/native': [],
  },
  contractType: {
    smartContractWallet: 'SCW',
    smartContract: 'SC',
    smartContractForwarder: 'SCF',
  },
  system_info_config: {
    biconomyForwarderAddressMap,
    biconomyForwarderAddressesMap,
    erc20ForwarderAddressMap,
    oracleAggregatorAddressMap,
    transferHandlerAddressMap,
    daiTokenAddressMap,
    usdtTokenAddressMap,
    usdcTokenAddressMap,
    sandTokenAddressMap,
    biconomyForwarderAbiMap,
    erc20ForwarderAbiMap,
    erc20ForwarderV2AbiMap,
    oracleAggregatorAbiMap,
    transferHandlerAbiMap,
    daiTokenAbiMap,
    usdtTokenAbiMap,
    sandTokenAbiMap,
    usdcTokenAbiMap,
    walletFactoryAddressMap,
    baseWalletAddressMap,
    entryPointAddressMap,
    handlerAddressMap,
  },
  currency: {
    8995: 'MATIC',
    80001: 'MATIC',
    137: 'MATIC',
    3: 'ETH',
    4: 'ETH',
    5: 'ETH',
    16110: 'MATIC',
    5777: 'DEV',
    15001: 'MATIC',
    42: 'ETH',
    1512051714758: 'DEV',
    1: 'ETH',
    77: 'SPOA',
    100: 'XDAI',
    31: 'RBTC',
    43113: 'AVAX',
    43114: 'AVAX',
    97: 'BNB',
    1287: 'GLMR',
    1284: 'GLMR',
    56: 'BNB',
    2021: 'EDG',
    421611: 'ETH',
    42161: 'AETH',
    1285: 'MOVR',
    250: 'FTM',
    4002: 'FTM',
  },
  decimal: {
    8995: 18,
    80001: 18,
    137: 18,
    3: 18,
    4: 18,
    5: 18,
    16110: 18,
    15001: 18,
    42: 18,
    1: 18,
    77: 18,
    100: 18,
    31: 8,
    43113: 18,
    43114: 18,
    97: 18,
    1287: 18,
    1284: 18,
    56: 18,
    2021: 18,
    421611: 18,
    42161: 18,
    1285: 18,
    250: 18,
    4002: 18,
  },
  signatureType: {
    PERSONAL_SIGNATURE: 'PERSONAL_SIGN',
    EIP712_SIGNATURE: 'EIP712_SIGN',
  },
  permitType: {
    DAI: 'DAI_Permit',
    EIP2612: 'EIP2612_Permit',
  },
  TOKEN_GAS_PRICE_THRESHOLD_PERCENTAGE: 95,
  forwarderDomainName: 'Biconomy Forwarder', // Default
  forwarderVersion: '1',
  connectionUrl: process.env.WEB_SOCKET_URL,
  timeZoneOffsetInMs: new Date().getTimezoneOffset() * 60 * 1000,
  conditionalProvider: {
    1: 'https://eth-mainnet.alchemyapi.io/v2/8vLFyF65nIpyd1CrfhqHd7kYtetw3Y7y',
    4: 'https://eth-rinkeby.alchemyapi.io/v2/uS9dgQomYwQrzwGHlErrn71mO3N6go9C',
    5: 'https://eth-goerli.g.alchemy.com/v2/tHph5L3QWvujUl7NiQGAqw8jE3qySzJG',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/s6bOKN9QDGXpVbsqzJMl_AHeZHNOCTcM',
    80001: 'https://polygon-mumbai.g.alchemy.com/v2/s6bOKN9QDGXpVbsqzJMl_AHeZHNOCTcM',
  },
};

let supportedNetworks = process.env.SUPPORTED_NETWORKS;

try {
  if (supportedNetworks) {
    supportedNetworks = JSON.parse(supportedNetworks);
  }
} catch (error) {
  throw new Error('Supported networks array not found in process env');
}

envConfig.supportedNetworks = supportedNetworks;

const setupConfig = async () => {
  config = envConfig;
  return 'done';
};

export {
  config,
  setupConfig,
};
