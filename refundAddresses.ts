import hdkey from 'hdkey';
import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { string } from 'joi';
const { ethers } = require('ethers');
const fs = require('fs');

const RECIPIENT= "0x7cC2F9185BbA1340CD187311B5d623C3833cdD61";
// const RPC_URL="https://polygon-mumbai.g.alchemy.com/v2/bfY6J-y_aqKko39b5KmzSEnP75yiTzNw"
const RPC_URL="https://subnets.avax.network/pgjjtk/testnet/rpc"
const THRESHOLD_BALANCE=0.11

// let rpcUrl = 'https://polygon-mainnet.g.alchemy.com/v2/xa1frMC-ihYEJcVn9eybSfhc-OtXbixj'
const relayersMasterSeed = '2926dbdea2462006772227980104970eb215e4fb67c580df471069c1c5f0837c4dffb11d1ce70695582d94710c2ca2ab0c9a22a493372d2cc29f05348bb44cfb';
const nodePathRoot = "m/44'/60'/0'/";


// If you're using process.env or config, ensure you import and setup necessary configurations
// const nodePathIndex = process.env.NODE_PATH_INDEX || 0;  // Example fallback value

const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
const ethRoot = hdkey.fromMasterSeed(seedInBuffer);
const nodePath = `${nodePathRoot + 0}/`;
// const ethNodePath: any = ethRoot.derive(nodePath + relayerIndex);
// const privateKey = ethNodePath._privateKey.toString('hex');
// const ethPubkey = privateToPublic(ethNodePath.privateKey);

// const ethAddr = publicToAddress(ethPubkey).toString('hex');

// console.log('Ethereum Address:', ethAddr);
// console.log('Private key:', privateKey);

async function generatePrivateKeys(nodePath: string, numberOfRelayers: number): Promise<string[]> {
  const privateKeys = [];

  for (let relayerIndex = 0; relayerIndex < numberOfRelayers; relayerIndex++) {  // Replace 10 with the desired number of iterations
    const ethNodePath: any = ethRoot.derive(nodePath + relayerIndex);
    const privateKey = ethNodePath._privateKey.toString('hex');
    const ethPubkey = privateToPublic(ethNodePath.privateKey);
    const ethAddr = publicToAddress(ethPubkey).toString('hex');
  // const balanceEther = await getBalance(ethAddr);
  


  // console.log(`Relayer Index: ${relayerIndex}`);
  console.log('Ethereum Address:', ethAddr);
  privateKeys.push(privateKey);

  // console.log('Private key:', privateKey);
  // console.log(`Balance of address ${ethAddr}: ${balanceEther} Matic`);
  // console.log('----------------------');
  // if (parseFloat(balanceEther) > 0.41 ){
  //     console.log(`Balance is greater than threshold, excess balance is ${parseFloat(balanceEther) - 0.41 }`)
  //     await sendEther(privateKey, (parseFloat(balanceEther) - 0.41).toString())
  //   }
  }
  return privateKeys;
  
}

async function refundAddress(hexPrivateKey: string) {

  const privateKey = Buffer.from(hexPrivateKey, 'hex');  // Replace 'YOUR_PRIVATE_KEY_IN_HEX' with the actual private key

  // Generate the public key
  const publicKey = privateToPublic(privateKey);

  // Derive the Ethereum address
  const address = publicToAddress(publicKey).toString('hex');
  const balanceEther = await getBalance(RPC_URL, address);

    console.log(`Balance of address ${address}: ${balanceEther} Matic`);
    console.log('----------------------');
    if (parseFloat(balanceEther) > THRESHOLD_BALANCE ){
        console.log(`Balance is greater than threshold, excess balance is ${parseFloat(balanceEther) - THRESHOLD_BALANCE }`)
        await sendEther(hexPrivateKey, (parseFloat(balanceEther) - THRESHOLD_BALANCE).toString())
      }
    
}


// async function getBalance(ethAddr: string): Promise<string> {
//   ;
//   let provider = new ethers.providers.JsonRpcProvider(RPC_URL);

//   // Query balance
//   const balanceWei = await provider.getBalance(ethAddr);
//   const balanceEther = ethers.utils.formatEther(balanceWei);
//   return balanceEther

// }

async function getBalance(providerUrl: string, ethAddr: string): Promise<string> {
  ;
  let provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  // Query balance
  const balanceWei = await provider.getBalance(ethAddr);
  const balanceEther = ethers.utils.formatEther(balanceWei);
  return balanceEther

}







https://subnets.avax.network/pgjjtk/testnet/rpc

async function sendEther(privateKey: string, amount: string) {
    // Connect to the network
    ;
    let provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    // Your private key (Replace with your actual private key)

    // Create a wallet from the private key and connect it to the provider
    console.log(`Sending transaction with ${privateKey}`)
    let wallet = new ethers.Wallet(privateKey, provider);

  
  // Fetching current gas price from the network
  let currentGasPrice = await provider.getGasPrice();
  // Setting the gas price 20% higher than the current gas price
  const increasedGasPrice = currentGasPrice.mul(130).div(100);
  console.log(increasedGasPrice)
  const transaction = {
    to: RECIPIENT,
    value: ethers.utils.parseEther(amount),
    gasPrice: increasedGasPrice
};

  let tx = await wallet.sendTransaction(transaction);
  console.log(tx.hash);

  await tx.wait();
  console.log(`Transaction confirmed with hash: ${tx.hash}`);
}

// sendEther(privateKey).catch(console.error);
async function main() {
  let allAddresses: string[] = [];
  let numberOfRelayers: number = 20
  const nodePath = `${nodePathRoot}${0}/`;

  const privateKeys = await generatePrivateKeys(nodePath, numberOfRelayers);
  console.log(privateKeys)
  for (let privateKeyIndex = 0; privateKeyIndex < privateKeys.length; privateKeyIndex++) {  // Replace 10 with the desired number of iterations
    const privateKey = privateKeys[privateKeyIndex]
    await refundAddress(privateKey);

  }
}

console.log(getBalance(RPC_URL, RECIPIENT));


// main().catch(error => {
//   console.error('Error encountered:', error);
// });

