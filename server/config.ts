interface LooseObject {
  [key: string]: any
}

// eslint-disable-next-line import/no-mutable-exports
let config: LooseObject = {};

const envConfig: LooseObject = {
  supportedChainIds: [1, 5, 4, 80001, 137],
  erc20TokenGasPriceInterval: process.env.ERC20_TOKEN_GAS_PRICE_INTERVAL,
  networkSymbolsCategories: {
    ETH: [1, 5, 4],
    MATIC: [80001, 137],
  },
};

const setupConfig = async () => {
  config = envConfig;
  return 'done';
};

export {
  config,
  setupConfig,
};
