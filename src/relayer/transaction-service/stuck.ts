import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// const chainId = 80002;
const relayerAddress = "0x61f6c37a5eb00338aede7f6042cdb6915cde4e22";
const relayerPrivateKey =
  "4a9c768a578773535856d5940fa6eb1f6e8f11c333555d3c4aa7972a3347fc97";
const rpcUrl =
  "https://polygon-amoy.g.alchemy.com/v2/h1D2zpv41KU-ZXIR8fMnD-rEMSEjmBHe";

async function sendForeverPendingTransaction() {
  console.log(
    `Sending forever pending transaction from relayerAddress=${relayerAddress} with relayerPrivateKey=${relayerPrivateKey}`,
  );

  const account = privateKeyToAccount(`0x${relayerPrivateKey}`);
  const walletClient = createWalletClient({
    transport: http(rpcUrl),
    account,
  }).extend(publicActions);

  const pendingNonce = await walletClient.getTransactionCount({
    address: "0x61f6c37a5eb00338aede7f6042cdb6915cde4e22",
    blockTag: "pending",
    // pending: true,
  });

  const latestNonce = await walletClient.getTransactionCount({
    address: "0x61f6c37a5eb00338aede7f6042cdb6915cde4e22",
    blockTag: "latest",
  });

  console.log(`pendingNonce=${pendingNonce}, latestNonce=${latestNonce}`);

  // const tx = await walletClient.getTransaction({
  //   hash: "0xd7a2fdbdece7ebbcbae0b12865e01de90a66532e6b1262c6e837d4fcc7060294",
  // });
  // console.log(tx);

  walletClient.watchPendingTransactions({
    onTransactions: (hashes) => console.log(hashes),
  });

  // const txHash = await walletClient.sendTransaction({
  //   account,
  //   to: relayerAddress,
  //   value: 0n,
  //   data: "0x",
  //   nonce: 5,
  //   chain: null,
  //   type: "eip1559",
  //   gas: 21000n,
  //   maxFeePerGas: parseGwei("1"),
  //   maxPriorityFeePerGas: parseGwei("0.1"),
  // });

  // console.log(`txHash=${txHash}`);

  // const tx = await walletClient.getTransaction({
  //   hash: "0x8c38c4f310d5af44eb5fffead84bad4c2261900a3ae205e2b8cc87ed734deb70",
  // });
}

sendForeverPendingTransaction();
