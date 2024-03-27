/* eslint-disable no-console */
import axios from "axios";

const rpcUrl = "<YOUR RPC URL>";

const txHash = "<YOUR TRANSACTION HASH>";

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
