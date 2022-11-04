export class Onfinality {
  constructor() {
  }
  getRpcUrl(networkId: number) {
      const rpcUrl: any = {}

      rpcUrl[1285] = `https://astar.api.onfinality.io/rpc?apikey=${process.env.ONFINALITY_MOONRIVER_MAINNET_SERVER_KEY}`
  
      return rpcUrl[networkId];
  }

  getRpcUrlPriority(networkId: number) {
    const rpcUrlPriority: any = {}

    rpcUrlPriority[1285] = 1;
    
    return rpcUrlPriority[networkId];
  }
}