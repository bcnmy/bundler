export class PublicProvider {
  constructor() {
  }
  getRpcUrl(networkId: number) {
      const rpcUrl: any = {}

      rpcUrl[1] = `https://mainnet.infura.io/v3/${process.env.INFURA_MAINNET_SERVER_KEY}`;
      rpcUrl[10] = 'https://mainnet.optimism.io';
      rpcUrl[56] = 'https://bsc-dataseed.binance.org';
      rpcUrl[100] = 'https://rpc.xdaichain.com';
      rpcUrl[137] = 'https://rpc-mainnet.matic.network';
      rpcUrl[250] = 'https://rpc.ftm.tools/';
      rpcUrl[1285] = 'https://rpc.moonriver.moonbeam.network';
      rpcUrl[42161] = 'https://arb1.arbitrum.io/rpc';
      rpcUrl[43114] = 'https://api.avax.network/ext/bc/C/rpc';
      rpcUrl[80001] = 'https://matic-testnet-archive-rpc.bwarelabs.com';

      return rpcUrl[networkId];
  }

  getRpcUrlPriority(networkId: number) {
    const rpcUrlPriority: any = {}

    rpcUrlPriority[1] = 10;
    rpcUrlPriority[10] = 10;
    rpcUrlPriority[56] = 10;
    rpcUrlPriority[100] = 10;
    rpcUrlPriority[137] = 10;
    rpcUrlPriority[250] = 10;
    rpcUrlPriority[42161] = 10;
    rpcUrlPriority[43114] = 10;
    rpcUrlPriority[80001] = 10;
      
    return rpcUrlPriority[networkId];
}
}