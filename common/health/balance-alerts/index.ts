import { appConfig } from "../../../server/src/services";
import { Alerts, Monitor } from "@biconomy/alerts";
import { Relayers } from "../relayers";

export class BalanceAlerts {
    constructor() { }
    async setup() {
        const supportedNetworks = appConfig.supportedNetworks;
        const mainNetworkIds = appConfig.mainNetworkIds;
        // const mainNetworkIds = ['137'];
        for (const networkId of mainNetworkIds) {

            const _addressList = await new Relayers().getAddressList();

            if (!_addressList[networkId]) continue;

            const addressList = _addressList[networkId].relayers.map((a: any) => {
                const { address } = a;
                return {
                    address,
                    addressType: 'RELAYER ACCOUNT',
                }
            });

            if (!appConfig.intervalOfBalanceAlert[networkId]) {
                console.log(`no interval provided for ${appConfig.networkName[networkId]} - ${networkId}`);
            };

            if (!appConfig.provider[networkId]) {
                console.info(`no rpc url provided for network id - ${networkId}`);
                continue;
            }

            if (!appConfig.explorerUrl[networkId]) {
                console.info(`no explorer url provided for network id - ${networkId}`);
                continue;
            }

            console.info(`setting up balance alerts for ${appConfig.networkName[networkId]}`);


            const threshold = appConfig.RELAYER_MINIMUM_THRESHOLD_BALANCE_PER_NETWORK[networkId] || 1;
            const thresholdInWei = (threshold * Math.pow(10, appConfig.decimal[networkId])).toString();

            try {

                const alert = new Alerts(addressList, {
                    symbol: appConfig.currency[networkId],
                    name: appConfig.networkName[networkId],
                    type: mainNetworkIds.includes(networkId) ? "Mainnet" : "Testnet",
                    explorerUrl: appConfig.explorerUrl[networkId],
                    jsonRpcURL: appConfig.provider[networkId],
                    monitoring: Monitor.BELOW,
                    threshold: thresholdInWei,
                    interval: appConfig.intervalOfBalanceAlert[networkId] || 30, // value in minutes
                    slack: {
                        token: appConfig.notification.slack.BALANCE_ALERT_TOKEN,
                        channel: appConfig.notification.slack.channelIds[1]
                    }
                });
                alert.start();

            } catch (error) {
                console.log(error);
                
            }
        }
    }
}