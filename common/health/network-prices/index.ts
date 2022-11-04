import { appConfig } from "../../../server/src/services";
import { slackInstance } from "../../instances";
import { networkPriceCall } from "../../utils/axios-calls";
import { client } from "../../utils/cache";

export class NetworkPrices {

    constructor() { 
    }

    async setTokenPriceInFiat() {
        const symbols = Object.keys(appConfig.networkSymbolsCategories).join(',');
        const requestOptions = {
            params: {
                symbol: symbols,
                convert: "USD"
            },
            headers: {
                "X-CMC_PRO_API_KEY": appConfig.coinsrate_api_key
            }
        };
        let response: any;
        try {
            response = await networkPriceCall(appConfig.coinMarketCapApi, requestOptions);
        } catch (error: any) {
            slackInstance.sendMessage(`Failed to fetch network prices from coinmarketcap.\nError Code - ${error.response.data.status.error_code}\nError Message - ${error.response.data.status.error_message}`)
            return;
        }

        const networkKeys = Object.keys(response.data);
        if (networkKeys) {
            const coinsRateObj: any = {};
            networkKeys.forEach(network => {
                const coinNetworkIds = appConfig.networkSymbolsCategories[network];
                coinNetworkIds.forEach((networkId: string) => {
                    coinsRateObj[networkId] = response.data[network].quote.USD.price.toFixed(2);
                });
            });

            await client.set(appConfig.networkFiatPricingKey, JSON.stringify(coinsRateObj));
            await client.set(`LAST_UPDATE_${appConfig.networkFiatPricingKey}`, (Date.now()).toString());

        } else {
            console.error("Network keys is not defined while fetching the network prices");
        }
    }

    async getTokenPriceInFiat(networkId?: string) {
        const _price = await client.get(appConfig.networkFiatPricingKey);
        const price = JSON.parse(_price);
        return networkId ? price[networkId] : price;
    }

    async getLastUpdateTokenPriceInFiat() {
        return await client.get(`LAST_UPDATE_${appConfig.networkFiatPricingKey}`);
    }
}