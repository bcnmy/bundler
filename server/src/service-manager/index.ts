import { Network } from 'network-sdk';
import { Mongo } from '../../../common/db';
import { DaoUtils } from '../dao-utils';
import { GasPrice } from '../../../common/gas-price';
import { initSetERC20TokenPrices } from '../../../common/network-price/coin-market-cap';
import { config } from '../../config';

let { supportedNetworks } = config;
supportedNetworks = JSON.parse(supportedNetworks);
const dbInstance = new Mongo(process.env.MONGO_URL || '');
const daoUtilsInstance = new DaoUtils(dbInstance);
const gasPriceMap: Record<number, GasPrice> = {};

(async () => {
  await dbInstance.connect();
  await initSetERC20TokenPrices();
  for (const networkId of supportedNetworks) {
    const rpcURL: string = config.provider[networkId];
    // Create new instance of Network SDK for all supported networks
    const network: Network = new Network(rpcURL);
    gasPriceMap[networkId] = new GasPrice(networkId, network);
    gasPriceMap[networkId].scheduleForUpdate(
      config.gasPriceService.updateFrequencyInSecond[networkId],
    );
  }
})();

export {
  daoUtilsInstance,
  dbInstance,
  gasPriceMap,
};
