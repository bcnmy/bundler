import axios from "axios";
import { client } from "../../utils/cache";

export class Relayers {
    constructor() { }

    async getAddressList() {
        let data: any = {}
        try {
            const r = await axios.get(`${process.env.CORE_SERVER_URL}/relayers-addresses`, {
                timeout: 3000
            });
            if (r.data.code === 200) {
                data = r.data?.data;
            }
        } catch (error) {
            console.error(`relayer address api failed `, error);
            return [];
        }

        const networkIds = Object.keys(data?.relayerAddresses || {})
        let relayerAddressData: any = {};
        if (networkIds.length) {
            for (const nId of networkIds) {
                if (data?.relayerAddresses[nId]) {
                    relayerAddressData[nId] = data?.relayerAddresses[nId];
                    // update list if already data in the cache
                    const relayerAdressesInCache = await client.get(`RELAYER_ADDRESS_LIST_${nId}`);
                    if (relayerAdressesInCache) {
                        
                        const existingAddressesList = JSON.parse(relayerAdressesInCache) || { relayers: [] };
                        const relayerAddressList = Array.from(new Set(existingAddressesList.relayers.concat(data?.relayerAddresses[nId].relayers)))
                        relayerAddressData[nId].relayers = relayerAddressList;
                    }

                    await client.set(`RELAYER_ADDRESS_LIST_${nId}`, JSON.stringify(relayerAddressData[nId]));
                    await client.expire(`RELAYER_ADDRESS_LIST_${nId}`, 60*60*24); // set expiry of relayer data to 24 hours
                }
            };
        }
        return relayerAddressData;
    }
}