export class Alchemy {
  constructor() {
  }
  getRpcUrl(networkId: number) {
      const rpcUrl: any = {}

      rpcUrl[137] = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MATIC_MAINNET_SERVER_KEY}`
      rpcUrl[80001] = `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_MATIC_TESTNET_SERVER_KEY}`
  
      return rpcUrl[networkId];
  }

  getRpcUrlPriority(networkId: number) {
    const rpcUrlPriority: any = {}

      rpcUrlPriority[137] = 1;
      rpcUrlPriority[80001] = 1;
      
      return rpcUrlPriority[networkId];
  }
}