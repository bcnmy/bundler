import { config } from '../../../../config';
import { logger } from "../../../../common/log-config";
import { ethers } from "ethers";

import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";
import {
    getSignedVAA,
    getEmitterAddressEth,
    ChainName,
    parseSequenceFromLogEth,
    CONTRACTS
} from "@certusone/wormhole-sdk";

import { sendToQueue, IDataToPushInQueue } from '../../service-manager/queue';
import { CCMPMessage } from "../../../../common/types";
import { Network } from "network-sdk";
// import { simulateService } from '../simulate';
import { AddGasOptions, AxelarGMPRecoveryAPI, AxelarQueryAPI, Environment, EvmChain, GasPaidStatus, GasToken, GMPStatus } from "@axelar-network/axelarjs-sdk";

import { chainIds } from "./wormhole/chainIds";
import { abi as CCMP_RECEIVE_MESSAGE_FACET_ABI } from "../../../../artifacts/contracts/CCMPReceiverMessageFacet";

const log = logger(module);
const { ccmp: ccmpConfig } = config;
const axelarRecoverySDK = new AxelarGMPRecoveryAPI({
    environment: Environment.TESTNET,
});
const axelarQuerySdk = new AxelarQueryAPI({
    environment: Environment.TESTNET,
});
const abiCoder = new ethers.utils.AbiCoder();

class CCMPTransactionHandler {
    private network: Network;

    constructor(rpcUrl: string) {
        console.log("attempting to create a network sdk instance")
        this.network = new Network(rpcUrl);
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async handleMessage(txHash: string, gasUsage: number, ccmpEventData: CCMPMessage) {
        // TODO: input validations
        console.log("handling message in ccmp txn handler")

        const baseErrorMsg = "failed to retrieve CCMP message";
        let msgVerificationData = undefined;

        await this.delay(5000);

        switch (ccmpEventData.routerAdaptor.toLowerCase()) {
            case "wormhole":
                console.log("adapter is wormhole");
                const emmitter = getEmitterAddressEth(ccmpEventData.sourceAdaptor.toLowerCase());
                console.log("emitter address is", emmitter);

                const { vaaBytes } = await getSignedVAA(
                    ccmpConfig.bridges.wormhole.hostURL,
                    this.getWormholeMappedChainName(ccmpEventData.sourceChainId.toString()),
                    emmitter,
                    parseSequenceFromLogEth(
                        await this.getTransactionReceipt(txHash),
                        CONTRACTS.TESTNET.polygon.core // TODO: toggle environment
                    ),
                    {
                        transport: NodeHttpTransport(),
                    }
                );

                // console.log(`received VAA from Wormhole Guardians: ${vaaBytes.toString()}`);
                console.log(`received VAA from Wormhole Guardians: ${vaaBytes}`);
                msgVerificationData = vaaBytes; //Buffer.from(vaaBytes).toString("binary");
                break;
            case "axelar":
                console.log("adapter is axelar");
                await this.delay(5000);
                let resp = await axelarRecoverySDK.queryTransactionStatus(txHash);
                while (resp.status !== GMPStatus.DEST_EXECUTED) {
                    resp = await axelarRecoverySDK.queryTransactionStatus(txHash);
                    console.log(`checking txn status on axelar ${JSON.stringify(resp)}`);

                    if (resp.gasPaidInfo?.status !== GasPaidStatus.GAS_PAID) {

                        const gasFee = await axelarQuerySdk.estimateGasFee(
                            EvmChain.AVALANCHE,
                            EvmChain.POLYGON,
                            GasToken.AVAX
                        );
                        const options: AddGasOptions = {
                            // amount: gasFee, // The amount of gas to be added. If not specified, the sdk will calculate the amount to be paid.
                            refundAddress: "0xe0E67a6F478D7ED604Cf528bDE6C3f5aB034b59D", //"0x8188962680514a126E1c42977E305707361d2049", // The address to get refunded gas. If not specified, the default value is the tx sender address.
                            // estimatedGasUsed: gasUsage, // An amount of gas to execute `executeWithToken` or `execute` function of the custom destination contract. If not specified, the default value is 700000.
                            evmWalletDetails: { useWindowEthereum: false, privateKey: "6fa6d23734d9aa0b86bc69d1956bc644050e7d1237096ea06bdd3f9b2ce3bcfa" }, //"0xe258a76e1e0abac08e57e67542087f04dd119a73a5f5dec879195fa9b313970e" }, // A wallet to send an `addNativeGas` transaction. If not specified, the default value is { useWindowEthereum: true}.
                        };

                        const { success, transaction, error } = await axelarRecoverySDK.addNativeGas(
                            EvmChain.AVALANCHE,
                            txHash,
                            options
                        );

                        if (success) {
                            console.log("Added native gas tx:", transaction?.transactionHash);
                        } else {
                            console.error("Cannot add native gas", error);
                        }
                    }
                    
                    await this.delay(10000);
                }
                
                msgVerificationData = abiCoder.encode(["uint256"], [0]);

                break;
            default:
                log.error(`${baseErrorMsg}: received unsupported bridge router`);
                throw new Error(`${baseErrorMsg}: received unsupported bridge router`);
        }

        // await this.saveMessage(msgVerificationData); // TODO: save to db

        // // TODO: get from simulation service
        // const resp = await simulateService(destinationGateway, msgVerificationData, destinationChainId, {
        //     tokenGasPrice: '',
        //     gasToken: ''
        // });
        // // TODO: check resp status, etc.

        // const simulatedGasLimit = resp.data ? resp.data[0].gasLimit : 25000; // TODO: fetch else clause from config

        const CCMPGatewayInterface = new ethers.utils.Interface(CCMP_RECEIVE_MESSAGE_FACET_ABI);
        
        const data = CCMPGatewayInterface.encodeFunctionData("receiveMessage", [ccmpEventData, msgVerificationData, false]);
        console.log("abi encoded `receiveMessage` data:", data)

        const dataToEnqueue: IDataToPushInQueue = {
            transactionId: txHash,
            type: 0, // TODO: (1) where to get this and (2) make sure this means CCMP
            to: ccmpEventData.destinationGateway,
            gasLimit: "0xF4240", // String(simulatedGasLimit),
            value: "0", // TODO: check fee payment model
            data,
            chainId: Number(ccmpEventData.destinationChainId)
        }

        console.log("sending data to queue:", data)
        await sendToQueue(dataToEnqueue);
    }

    private async saveMessage(signedMessage: string) {
        // TODO: db stuff
    }

    private async simulateCCMPTransaction(signedMessage: string) {

    }

    private getWormholeMappedChainName(conventionalChainID: string): ChainName {
        const wormholeChainName = chainIds[conventionalChainID] as ChainName; // TODO: null check and error handling
        return wormholeChainName;
    }

    // private getRelayer(sourceChainId: ethers.BigNumberish): Relayer {
    //     const relayerManager = relayerManagerMap[Number(sourceChainId)]; // TODO: key should be of type `any`
    //     return relayerManager.relayersMap["0x9a62c40613f29d69fb57d85b98ebcda3f0d9adb2"];
    // }

    private async getTransactionReceipt(txHash: string) {
        const provider = await this.network.getProvider();
        console.log(provider);
        console.log(txHash);
        await this.delay(5000);
        const receipt = await provider.getTransactionReceipt(txHash);
        console.log(receipt.logs);
        return receipt;
    }
    /*
        private async getCCMPMessagePayloadFromSourceTx(txHash: string): Promise<CCMPMessage> {
            const CCMPMessageRoutedTopic = "0xb163bf360fef1e41e4f6cecd0a3e58913c8abcbc45c112f1fb963f2ac9d047e5";
    
            const receipt = await this.getTransactionReceipt(txHash);
            const CCMPGatewayInterface = new ethers.utils.Interface(gatewayABI)
    
            const log = receipt.logs.find((log) => log.topics[0] === CCMPMessageRoutedTopic);
            if (!log) {
                throw new Error(`No CCMP message routed log found for transaction ${txHash}`);
            }
            const data = CCMPGatewayInterface.parseLog(log);
    
            const {
                sender,
                sourceGateway,
                sourceAdaptor,
                sourceChainId,
                destinationGateway,
                destinationChainId,
                nonce,
                routerAdaptor,
                gasFeePaymentArgs,
                payload,
            } = data.args;
    
            return {
                sender,
                sourceGateway,
                sourceChainId,
                sourceAdaptor,
                destinationChainId,
                destinationGateway,
                nonce,
                routerAdaptor,
                gasFeePaymentArgs,
                payload,
            };
        };
    */

}

export { CCMPTransactionHandler };


