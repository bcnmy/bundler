import { config } from '../../config';
import { EVMNetworkService } from '../../common/network';

const networkServiceMap: {
  [chainId: number]: EVMNetworkService;
} = {};

for (const supportedNetwork of config.supportedNetworks) {
  networkServiceMap[supportedNetwork] = new EVMNetworkService({
    chainId: supportedNetwork,
    rpcUrl: config.chains.provider[supportedNetwork],
    fallbackRpcUrls: config.chains.fallbackUrls[supportedNetwork] || [],
  });
}

describe('Network Service: Rpc Urls', () => {
  it('Main rpc url should be active for chainId: 5', async () => {

  });

  it('Main rpc url should be active for chainId: 80001', async () => {

  });

  it('Fallback urls should be active for chaindId: 5', async () => {

  });

  it('Fallback urls should be active for chaindId: 80001', async () => {

  });
});

describe('Network Service: Gas Prices', () => {
  it('Type 0 transaction type gas price is not null/zero for chainId: 5', async () => {

  });

  it('Type 0 transaction type gas price is not null/zero for chainId: 80001', async () => {

  });

  it('Type 2 transaction type gas price is not null/zero for chainId: 5', async () => {

  });

  it('Type 2 transaction type gas price is not null/zero for chainId: 80001', async () => {

  });
});

describe('Network Service: Native Asset Balance', () => {
  it('Fetches the correct native asset balance on chainId: 80001', async () => {
    // create a new eth address
    // transfer 0.00001 native token from main account
    // check if the getBalance gets 0.00001
  });

  it('Fetches the correct native asset balance on chainId: 5', async () => {
    // create a new eth address
    // transfer 0.00001 native token from main account
    // check if the getBalance gets 0.00001
  });
});

describe('Network Service: Nonce Check', () => {
  it('Check if nonce is correct on chaindId: 80001', async () => {
    // use an address that we now the nonce of
    // then call getNonce() on that address
  });

  it('Check if nonce is correct on chaindId: 5', async () => {
    // use an address that we now the nonce of
    // then call getNonce() on that address
  });
});

describe('Network Service: Sending Transaction', () => {
  it('Transaction should be sent and confirm on chainId: 80001', async () => {

  });

  it('Transaction should be sent and confirm on chainId: 5', async () => {

  });
});
