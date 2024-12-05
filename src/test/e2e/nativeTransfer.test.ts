import { Chain, createWalletClient, http, PrivateKeyAccount } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, avalanche, optimism, polygon, bsc, arbitrum } from "viem/chains";
import {
  BiconomySmartAccountV2,
  createSmartAccountClient,
  PaymasterMode,
} from "@biconomy/account";

/**
 * This file contains end-to-end tests that can run against a local or production bundler instance.
 * The tests are disabled by default because they send real transactions and require real keys, URLs and balance in the smart account.
 * To run the tests, you need to set the following environment variables:
 * - PRIVATE_KEY: the private key of the account that will send the transactions
 * - BUNDLER_HOSTNAME: the hostname of the bundler instance
 *
 * If you want to test any of the chains you have to delete the 'skip' statement
 * and provide any of the following environment variables, depending on the chain you want to test:
 * - BASE_MAINNET_PAYMASTER_URL: the paymaster URL for the base chain
 * - OPTIMISM_MAINNET_PAYMASTER_URL: the paymaster URL for the optimism chain
 * - AVALANCHE_MAINNET_PAYMASTER_URL: the paymaster URL for the avalanche chain
 * - POLYGON_MAINNET_PAYMASTER_URL: the paymaster URL for the polygon chain
 * - BSC_MAINNET_PAYMASTER_URL: the paymaster URL for the bsc chain
 * - ARBITRUM_MAINNET_PAYMASTER_URL: the paymaster URL for the arbitrum chain
 *
 * You can refer to .env.example file for the environment variables.
 *
 * To run the tests, you can use the following command:
 * - yarn test:e2e
 *
 * 🔥 Don't commit un-skipped e2e tests so someone doesn't run them by accident 🔥
 */
describe("e2e", () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not defined");
  }
  const bundlerHostname = process.env.BUNDLER_HOSTNAME;
  if (!bundlerHostname) {
    throw new Error("BUNDLER_HOSTNAME is not defined");
  }

  const valueToSend = 1n; // send only 1 wei

  describe.skip("base-mainnet", () => {
    const chainId = 8453;
    const bundlerUrl = `${bundlerHostname}/api/v2/${chainId}/test`;

    const paymasterUrl = process.env.BASE_MAINNET_PAYMASTER_URL;
    if (!paymasterUrl) {
      throw new Error("BASE_MAINNET_PAYMASTER_URL is not defined");
    }

    it("should perform a native transfer using a paymaster", async () => {
      const account = privateKeyToAccount(`0x${privateKey}`);

      logConfig(bundlerUrl, paymasterUrl, account);

      const smartAccount = await buildSmartAccount(
        base,
        account,
        bundlerUrl,
        paymasterUrl,
        valueToSend,
      );

      const receipt = await sendUserOperation(account, smartAccount);
      console.log(receipt);

      expect(receipt.success).toBe("true");
    });
  });

  describe.skip("optimism-mainnet", () => {
    const chainId = 10;

    const bundlerUrl = `${bundlerHostname}/api/v2/${chainId}/test`;

    const paymasterUrl = process.env.OPTIMISM_MAINNET_PAYMASTER_URL;
    if (!paymasterUrl) {
      throw new Error("OPTIMISM_MAINNET_PAYMASTER_URL is not defined");
    }

    it("should perform a native transfer using a paymaster", async () => {
      const account = privateKeyToAccount(`0x${privateKey}`);

      logConfig(bundlerUrl, paymasterUrl, account);

      const smartAccount = await buildSmartAccount(
        optimism,
        account,
        bundlerUrl,
        paymasterUrl,
        valueToSend,
      );

      const receipt = await sendUserOperation(account, smartAccount);
      console.log(receipt);

      expect(receipt.success).toBe("true");
    });
  });

  describe.skip("avalanche-mainnet", () => {
    const chainId = 43114;

    const bundlerUrl = `${bundlerHostname}/api/v2/${chainId}/test`;

    const paymasterUrl = process.env.AVALANCHE_MAINNET_PAYMASTER_URL;
    if (!paymasterUrl) {
      throw new Error("AVALANCHE_MAINNET_PAYMASTER_URL is not defined");
    }

    it("should perform a native transfer using a paymaster", async () => {
      const account = privateKeyToAccount(`0x${privateKey}`);

      logConfig(bundlerUrl, paymasterUrl, account);

      const smartAccount = await buildSmartAccount(
        avalanche,
        account,
        bundlerUrl,
        paymasterUrl,
        valueToSend,
      );

      const receipt = await sendUserOperation(account, smartAccount);
      console.log(receipt);

      expect(receipt.success).toBe("true");
    });
  });

  describe.skip("polygon-mainnet", () => {
    const chainId = 137;

    const bundlerUrl = `${bundlerHostname}/api/v2/${chainId}/test`;

    const paymasterUrl = process.env.POLYGON_MAINNET_PAYMASTER_URL;
    if (!paymasterUrl) {
      throw new Error("POLYGON_MAINNET_PAYMASTER_URL is not defined");
    }

    it("should perform a native transfer using a paymaster", async () => {
      const account = privateKeyToAccount(`0x${privateKey}`);

      logConfig(bundlerUrl, paymasterUrl, account);

      const smartAccount = await buildSmartAccount(
        polygon,
        account,
        bundlerUrl,
        paymasterUrl,
        valueToSend,
      );

      const receipt = await sendUserOperation(account, smartAccount);
      console.log(receipt);

      expect(receipt.success).toBe("true");
    });
  });

  describe.skip("bsc-mainnet", () => {
    const chainId = 56;

    const bundlerUrl = `${bundlerHostname}/api/v2/${chainId}/test`;

    const paymasterUrl = process.env.BSC_MAINNET_PAYMASTER_URL;
    if (!paymasterUrl) {
      throw new Error("BSC_MAINNET_PAYMASTER_URL is not defined");
    }

    it("should perform a native transfer using a paymaster", async () => {
      const account = privateKeyToAccount(`0x${privateKey}`);

      logConfig(bundlerUrl, paymasterUrl, account);

      const smartAccount = await buildSmartAccount(
        bsc,
        account,
        bundlerUrl,
        paymasterUrl,
        valueToSend,
      );

      const receipt = await sendUserOperation(account, smartAccount);
      console.log(receipt);

      expect(receipt.success).toBe("true");
    });
  });

  describe.skip("arbitrum-mainnet", () => {
    const chainId = 42161;

    const bundlerUrl = `${bundlerHostname}/api/v2/${chainId}/test`;

    const paymasterUrl = process.env.ARBITRUM_MAINNET_PAYMASTER_URL;
    if (!paymasterUrl) {
      throw new Error("ARBITRUM_MAINNET_PAYMASTER_URL is not defined");
    }

    it("should perform a native transfer using a paymaster", async () => {
      const account = privateKeyToAccount(`0x${privateKey}`);

      logConfig(bundlerUrl, paymasterUrl, account);

      const smartAccount = await buildSmartAccount(
        arbitrum,
        account,
        bundlerUrl,
        paymasterUrl,
        valueToSend,
      );

      const receipt = await sendUserOperation(account, smartAccount);
      console.log(receipt);

      expect(receipt.success).toBe("true");
    });
  });
});

/**
 * A helper function to send a sponsored native transfer user operation
 * @param account viem account
 * @param smartAccount biconomy smart account
 * @returns receipt
 */
async function sendUserOperation(
  account: PrivateKeyAccount,
  smartAccount: BiconomySmartAccountV2,
) {
  const tx = {
    to: account.address,
    value: 1n,
  };

  const userOpResponse = await smartAccount.sendTransaction(tx, {
    paymasterServiceData: { mode: PaymasterMode.SPONSORED },
  });

  return userOpResponse.wait();
}

/**
 * A helper function to build a biconomy smart account for a given chain
 * @param chain viem chain
 * @param account viem account
 * @param bundlerUrl biconomy bundler url
 * @param paymasterUrl biconomy paymaster url
 * @param valueToSend value in wei
 * @returns biconomy smart account
 */
async function buildSmartAccount(
  chain: Chain,
  account: PrivateKeyAccount,
  bundlerUrl: string,
  paymasterUrl: string | undefined,
  valueToSend: bigint,
) {
  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const smartAccount = await createSmartAccountClient({
    signer: client,
    bundlerUrl,
    paymasterUrl,
  });
  await requireBalance(smartAccount, valueToSend);

  return smartAccount;
}

function logConfig(
  bundlerUrl: string,
  paymasterUrl: string,
  account: PrivateKeyAccount,
) {
  console.log(`Bundler URL: ${bundlerUrl}`);
  console.log(`Paymaster URL: ${paymasterUrl}`);
  console.log(`EOA Address: ${account.address}`);
}

async function requireBalance(
  smartAccount: BiconomySmartAccountV2,
  valueToSend: bigint,
) {
  const balances = await smartAccount.getBalances();
  const nativeBalance = balances[balances.length - 1];

  console.log(
    `smartAccount=${await smartAccount.getAddress()} native balance is ${nativeBalance.amount} wei`,
  );

  if (nativeBalance.amount < valueToSend) {
    throw new Error(
      `Insufficient balance in smart account with address ${await smartAccount.getAddress()}
Balance: ${nativeBalance.amount} wei, required: ${valueToSend} wei`,
    );
  }
}
