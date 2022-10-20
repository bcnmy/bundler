import rp from 'request-promise';
// const CCMP_GATEWAY_ABI = require("../../../../artifacts/CCMPGateway.json");
// const CCMP_GATEWAY_ABI = require("../../../../artifacts/gateway_mumbai_to_fantom.json");
import { abi as CCMP_SENDMESSAGE_FACET_ABI } from '../../../../artifacts/contracts/CCMPSendMessageFacet';

const indexerBaseUrl = 'http://localhost:8080'; // TODO: load from config

const registerWebhook = async (destinationUrl: string, auth: string, chainId: number, scAddress: string, eventData: any) => {
  const registerWebhookReq = {
    method: 'POST',
    uri: `${indexerBaseUrl}/registerWebhook`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      destination: destinationUrl,
      auth,
      chainId,
      contracts: [
        {
          scAddress,
          events: [eventData],
          abi: JSON.stringify(CCMP_SENDMESSAGE_FACET_ABI),
        }],
    },
    json: true,
  };

  console.log(JSON.stringify(registerWebhookReq));

  const registerWebhookRes = await rp(registerWebhookReq);
  console.log(`registerWebhookRes is ${JSON.stringify(registerWebhookRes)}`);
  return registerWebhookRes;
};

export { registerWebhook };
