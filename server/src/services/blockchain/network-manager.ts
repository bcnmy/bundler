import { Network } from '@bcnmy/network-sdk';
import { logger } from '../../../log-config';
import { config } from '../../../config';

const networkMap = new Map<number, Network>();

const log = logger(module);

log.info('Creating new Network instance for each supported network');
const { supportedNetworks } = config;

if (supportedNetworks) {
  supportedNetworks.forEach((networkId: number) => {
    if (config && config.provider) {
      const rpcURL: string = config?.provider[networkId];
      if (rpcURL) {
        // Create new instance of Network SDK for all supported networks
        const network = new Network(rpcURL);
        networkMap.set(networkId, network);
      } else {
        log.info(`Failed to create network instance for network Id ${networkId}`);
      }
    } else {
      log.info('Provider object is not initilized');
    }
  });
}

const getNetwork = (networkId: number) => networkMap.get(networkId);

export { getNetwork };
