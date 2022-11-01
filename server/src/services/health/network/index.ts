import { ethers } from "ethers";
import { checkBlockByNumber, checkNetworkGasPrice, checkNetworkListening, checkNetworkVersion } from "../../utils/health-check";

export class Network {
    ethersProvider: ethers.providers.Provider
    name: string

    constructor(name: string, rpcUrl: string) {
        this.name = name;
        this.ethersProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }

    async getNonceOfAddress(address: string) {
        return await this.ethersProvider.getTransactionCount(address, "pending");
    }

    async getTotalTransactionCount(address: string) {
        return await this.ethersProvider.getTransactionCount(address);
    }

    async getBalanceOfAddress(address: string) {
        const a = await this.ethersProvider.getBalance(address);
        return a.toString();
    }

    async isHealthy(rpcUrl: string, networkId: number, blockNumber: string) {
        const isNetworkListening = await checkNetworkListening(rpcUrl, networkId);
        // console.log(`isNetworkListening ${isNetworkListening}`);
        
        const isValidNetworkVersion = await checkNetworkVersion(rpcUrl, networkId);
        // console.log(`isValidNetworkVersion ${isValidNetworkVersion}`);

        const isValidNetworkGasPrice = await checkNetworkGasPrice(rpcUrl, networkId);
        // console.log(`isValidNetworkGasPrice ${isValidNetworkGasPrice}`);
        
        const isValidBlock = await checkBlockByNumber(rpcUrl, networkId, blockNumber);
        // console.log(`isValidBlock ${isValidBlock}`);

        if (isNetworkListening && isValidNetworkVersion && isValidNetworkGasPrice && isValidBlock) {
            return true;
        };
        return false;
    }
}