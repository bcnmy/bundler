import rp from "request-promise";
// const CCMP_GATEWAY_ABI = require("../../../../artifacts/CCMPGateway.json");
// const CCMP_GATEWAY_ABI = require("../../../../artifacts/gateway_mumbai_to_fantom.json");
import { abi as CCMP_SENDMESSAGE_FACET_ABI } from "../../../../artifacts/contracts/CCMPSendMessageFacet";

const indexerBaseUrl = "http://localhost:8080"; // TODO: load from config

const registerWebhook = async (destinationUrl: string, auth: string, chainId: number, scAddress: string, eventData: any) => {
    let registerWebhookReq = {
        method: "POST",
        uri: `${indexerBaseUrl}/registerWebhook`,
        headers: {
            "Content-Type": "application/json",
        },
        body: {
            destination: destinationUrl,
            auth: auth,
            chainId: chainId,
            contracts: [
            {
                scAddress: scAddress,
                events: [eventData],
                abi: JSON.stringify(CCMP_SENDMESSAGE_FACET_ABI)
            }]
        }, 
        json: true,
    };
    
    let registerWebhookRes = await rp(registerWebhookReq);
    console.log(`registerWebhookRes is ${JSON.stringify(registerWebhookRes)}`);
    return registerWebhookRes;
};

export { registerWebhook };
