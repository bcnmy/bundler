export class Moralis {
    constructor() { }

    getRpcUrl(networkId: number) {
        const rpcUrl: any = {}

        rpcUrl[1] = `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_MAINNET_SERVER_KEY}/eth/mainnet`;
        rpcUrl[3] = `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ROPSTEN_SERVER_KEY}/eth/ropsten`;
        rpcUrl[4] = `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_RINKEBY_SERVER_KEY}/eth/rinkeby`;
        rpcUrl[5] = `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_GOERLI_SERVER_KEY}/eth/goerli`;
        rpcUrl[42] = `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_KOVAN_SERVER_KEY}/eth/kovan`;
        return rpcUrl[networkId];
    }

    getRpcUrlPriority(networkId: number) {
        const rpcUrlPriority: any = {}

        rpcUrlPriority[1] = 2;
        rpcUrlPriority[3] = 2;
        rpcUrlPriority[4] = 2;
        rpcUrlPriority[5] = 2;
        rpcUrlPriority[42] = 2;
          
        return rpcUrlPriority[networkId];
    }

}