export class Infura {
    constructor() {
    }
    getRpcUrl(networkId: number) {
        const rpcUrl: any = {}

        rpcUrl[1] = `https://mainnet.infura.io/v3/${process.env.INFURA_MAINNET_SERVER_KEY}`;
        rpcUrl[3] = `https://ropsten.infura.io/v3/${process.env.INFURA_ROPSTEN_SERVER_KEY}`;
        rpcUrl[4] = `https://rinkeby.infura.io/v3/${process.env.INFURA_RINKEBY_SERVER_KEY}`;
        rpcUrl[5] = `https://goerli.infura.io/v3/${process.env.INFURA_GOERLI_SERVER_KEY}`;
        rpcUrl[42] = `https://kovan.infura.io/v3/${process.env.INFURA_KOVAN_SERVER_KEY}`;

        rpcUrl[80001] = `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_MATIC_TESTNET_SERVER_KEY}`
    
        return rpcUrl[networkId];
    }

    getRpcUrlPriority(networkId: number) {
        const rpcUrlPriority: any = {}

        rpcUrlPriority[1] = 1;
        rpcUrlPriority[3] = 1;
        rpcUrlPriority[4] = 1;
        rpcUrlPriority[5] = 1;
        rpcUrlPriority[42] = 1;

        rpcUrlPriority[80001] = 2;
          
        return rpcUrlPriority[networkId];
    }
}