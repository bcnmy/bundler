/* eslint-disable no-console */
import axios from "axios";

const rpcUrl =
  "https://opt-mainnet.g.alchemy.com/v2/0s6Ch-MRZPAmq1mdh0pTUCbm3q5IzpdN";

const txHash =
  "0x4a3107bf0b3988da1bd48cc646ac993c6d48f06b86733f0092fcfc89b7e84916";

// Change the constants defined above and run this script using: `ts-node fixture-generator.ts`
async function generate() {
  const fixture: { transaction?: any; transactionReceipt?: any } = {};

  {
    const requestData = {
      method: "eth_getTransactionByHash",
      params: [txHash],
      jsonrpc: "2.0",
      id: Date.now(),
    };
    const response = await axios.post(rpcUrl, requestData);
    const { data } = response;

    fixture.transaction = data.result;
  }

  {
    const requestData = {
      method: "eth_getTransactionReceipt",
      params: [txHash],
      jsonrpc: "2.0",
      id: Date.now(),
    };
    const response = await axios.post(rpcUrl, requestData);
    const { data } = response;

    fixture.transactionReceipt = data.result;
  }

  console.log(JSON.stringify(fixture, null, 2));
}

generate();
