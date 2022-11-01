import { appConfig } from "../..";
import { slackInstance, sock } from "../../instances";
import { supportedProviders } from "../../utils/providers";
import { Network } from "../network";
import { client } from "../../utils/cache";

const io = require('socket.io-client');
const CONFIG_SERVER_URL = process.env.CONFIG_SERVER_URL;
const socket = io.connect(CONFIG_SERVER_URL);

export class NodeProviders {


    activeProviders: any = {};
    socketPushProvider: any = {};

    constructor() {
    }

    async setupProviders() {
        for (const networkId of appConfig.supportedNetworks) {
            try {

                if (!supportedProviders[networkId].length) {
                    console.log(`Do not support network id ${networkId}`);
                    continue;
                }

                this.activeProviders[networkId] = [];
                this.socketPushProvider[networkId] = [];
                for (const p of supportedProviders[networkId]) {
                    const { name, rpcUrl } = p
                    console.log(`Setting up provider ${name} for network id ${networkId}`);
                    try {
                        const n = new Network(name, rpcUrl);
                        const isHealthy: boolean = await n.isHealthy(rpcUrl, networkId, 'latest') || false;
                        if (isHealthy) {
                            this.activeProviders[networkId].push({
                                name,
                                rpcUrl,
                            });
                            this.socketPushProvider[networkId].push(rpcUrl);
                            console.log(`added ${name} provider for ${networkId}`);
                        } else {
                            console.log(`provider ${name} is not healthy for ${networkId}`);
                        }
                        
                    } catch (error) {
                        console.log(`Failed to setup provider ${name}`, error);
                    }
                }

                if (this.socketPushProvider[networkId].length) {
                    socket.emit('update_configurations', JSON.stringify(this.socketPushProvider))
                    slackInstance.sendMessage(`[ALERT] No node provider available for network id ${networkId}`);
                }
                if (!this.activeProviders[networkId].length) {
                    console.log(`Network id ${networkId} is not in service`);
                    //trigger a message on slack saying providers are unhealthy for network id
                }
            } catch (error) {
                console.error(error);
            }
        }
        // set in redis
        await this.setNetworkRpcUrls(JSON.stringify(this.activeProviders));
    }

    async setNetworkRpcUrls(data: string) {
        await client.set(this.getNetworkRpcUrlsKey(), data);
    }

    async getNetworkRpcUrls() {
        // return gas price here
        return await client.get(this.getNetworkRpcUrlsKey());
    }

    getNetworkRpcUrlsKey() {
        return 'NETWORK_RPC_URLS';
    }
}