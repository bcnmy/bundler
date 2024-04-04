// import hdkey from 'hdkey';
// import { privateToPublic, publicToAddress } from 'ethereumjs-util';
// import { string } from 'joi';
// const { ethers } = require('ethers');
// const fs = require('fs');

// const RECIPIENT= "";

// const relayersMasterSeed = '';
// const nodePathRoot = "m/44'/60'/0'/";

// // If you're using process.env or config, ensure you import and setup necessary configurations
// // const nodePathIndex = process.env.NODE_PATH_INDEX || 0;  // Example fallback value

// const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
// const ethRoot = hdkey.fromMasterSeed(seedInBuffer);
// const nodePath = `${nodePathRoot + 0}/`;
// // const ethNodePath: any = ethRoot.derive(nodePath + relayerIndex);
// // const privateKey = ethNodePath._privateKey.toString('hex');
// // const ethPubkey = privateToPublic(ethNodePath.privateKey);

// // const ethAddr = publicToAddress(ethPubkey).toString('hex');

// // console.log('Ethereum Address:', ethAddr);
// // console.log('Private key:', privateKey);

// async function generateKeys(nodePath: string, numberOfRelayers: number): Promise<string[]> {
//   const addresses = [];

// for (let relayerIndex = 0; relayerIndex < numberOfRelayers; relayerIndex++) {  // Replace 10 with the desired number of iterations
//   const ethNodePath: any = ethRoot.derive(nodePath + relayerIndex);
//   const privateKey = ethNodePath._privateKey.toString('hex');
//   const ethPubkey = privateToPublic(ethNodePath.privateKey);
//   const ethAddr = publicToAddress(ethPubkey).toString('hex');
//   // const balanceEther = await getBalance(ethAddr);

//   // console.log(`Relayer Index: ${relayerIndex}`);
//   console.log('Ethereum Address:', ethAddr);
//   const address = `nodepath-${nodePath} , relayerIndex-${relayerIndex} , address-${ethAddr}`
//   addresses.push(address);

//   // console.log('Private key:', privateKey);
//   // console.log(`Balance of address ${ethAddr}: ${balanceEther} Matic`);
//   // console.log('----------------------');
//   // if (parseFloat(balanceEther) > 0.41 ){
//   //     console.log(`Balance is greater than threshold, excess balance is ${parseFloat(balanceEther) - 0.41 }`)
//   //     await sendEther(privateKey, (parseFloat(balanceEther) - 0.41).toString())
//   //   }
//   }
//   return addresses;

// }

// async function getBalance(ethAddr: string): Promise<string> {
//   let rpcUrl = 'https://polygon-mainnet.g.alchemy.com/v2/xa1frMC-ihYEJcVn9eybSfhc-OtXbixj';
//   let provider = new ethers.providers.JsonRpcProvider(rpcUrl);

//   // Query balance
//   const balanceWei = await provider.getBalance(ethAddr);
//   const balanceEther = ethers.utils.formatEther(balanceWei);
//   return balanceEther

// }

// async function sendEther(privateKey: string, amount: string) {
//     // Connect to the network
//     let rpcUrl = 'https://polygon-mainnet.g.alchemy.com/v2/xa1frMC-ihYEJcVn9eybSfhc-OtXbixj';
//     let provider = new ethers.providers.JsonRpcProvider(rpcUrl);
//     // Your private key (Replace with your actual private key)

//     // Create a wallet from the private key and connect it to the provider
//     let wallet = new ethers.Wallet(privateKey, provider);

//   // Fetching current gas price from the network
//   let currentGasPrice = await provider.getGasPrice();
//   // Setting the gas price 20% higher than the current gas price
//   const increasedGasPrice = currentGasPrice.mul(130).div(100);
//   console.log(increasedGasPrice)
//   const transaction = {
//     to: RECIPIENT,
//     value: ethers.utils.parseEther(amount),
//     gasPrice: increasedGasPrice
// };

//   let tx = await wallet.sendTransaction(transaction);
//   console.log(tx.hash);

//   await tx.wait();
//   console.log(`Transaction confirmed with hash: ${tx.hash}`);
// }

// // sendEther(privateKey).catch(console.error);
// async function main() {
//   let allAddresses: string[] = [];

//   const numberOfRelayers = 50; // or any other desired number
//   for (let index = 0; index <= 50; index++) {
//       const nodePath = `${nodePathRoot}${index}/`;
//       const addresses = await generateKeys(nodePath, numberOfRelayers);
//       allAddresses = allAddresses.concat(addresses);
//       allAddresses.concat("------------------------------------------------------------------")
//   }
//   fs.writeFileSync('output.txt', allAddresses.join('\n'));

// }

// main().catch(error => {
//   console.error('Error encountered:', error);
// });
