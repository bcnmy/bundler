import {
  createWalletClient,
  http,
  PrivateKeyAccount,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  base,
  avalanche,
  optimism,
  polygon,
  bsc,
  arbitrum,
  gnosis,
  blast,
  baseSepolia,
  berachainTestnetbArtio,
  sepolia,
} from "viem/chains";
import {
  BiconomySmartAccountV2,
  createSmartAccountClient,
  UserOperationStruct,
} from "@biconomy/account";
import { createNexusClient, getCustomChain } from "@biconomy/sdk";
import axios, { AxiosError } from "axios";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not defined");
  }
  const bundlerHostname = process.env.BUNDLER_HOSTNAME;
  if (!bundlerHostname) {
    throw new Error("BUNDLER_HOSTNAME is not defined");
  }

  const valueToSend = 1n; // send only 1 wei

  const stubPaymasterAndData =
    "0x00000f79b7faf42eebadba19acc07cd08af4478900000000000000000000000029c3e9456c0eca5beb1f78763204bac6c682407700000000000000000000000000000000000000000000000000000000676410e60000000000000000000000000000000000000000000000000000000067640fba0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004170f9cfb3f7a4204e0a497c8d19a98e2157b0df2740019ba2250a4c73de30539f14ea86cc47e0c96c16fd61b4b2f7ef777cf2c306974a03d56bdcc9313040242b1c00000000000000000000000000000000000000000000000000000000000000";

  describe.skip("base-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${base.id}/biconomy`;

      const paymasterUrl = process.env.BASE_MAINNET_PAYMASTER_URL;

      const signer = createWalletClient({
        account,
        chain: base,
        transport: http(),
      }).extend(publicActions);

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: signer,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("BASE_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          console.log(receipt);

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${base.id}/test`;

      logConfig(base.id, bundlerUrl, account, "");

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: base,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        console.log(`${base.name} EPv0.7.0 txHash: ${receipt.transactionHash}`);
        console.log(receipt);

        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("base-sepolia", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe.skip("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${baseSepolia.id}/test`;

      const paymasterUrl = process.env.BASE_SEPOLIA_PAYMASTER_URL;

      const signer = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(),
      }).extend(publicActions);

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: signer,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, 1n);
      });

      it("should perform a native transfer without a paymaster", async () => {
        // const receipt = await sendUserOperation(account, smartAccount, false);
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it.skip("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("BASE_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          console.log(receipt);

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe.skip("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${baseSepolia.id}/biconomy`;

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: baseSepolia,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        console.log(
          `${baseSepolia.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        console.log(receipt);

        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("optimism-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${optimism.id}/biconomy`;

      const paymasterUrl = process.env.OPTIMISM_MAINNET_PAYMASTER_URL;

      const client = createWalletClient({
        account,
        chain: optimism,
        transport: http(),
      });

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: client,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        // const receipt = await sendUserOperation(account, smartAccount, false);
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("OPTIMISM_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          console.log(receipt);

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${optimism.id}/test`;

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: optimism,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(
          `${optimism.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("avalanche-mainnet", () => {
    const bundlerUrl = `${bundlerHostname}/api/v2/${avalanche.id}/biconomy`;
    const account = privateKeyToAccount(`0x${privateKey}`);

    const paymasterUrl = process.env.AVALANCHE_MAINNET_PAYMASTER_URL;

    const client = createWalletClient({
      account,
      chain: avalanche,
      transport: http(),
    });

    let smartAccount: BiconomySmartAccountV2;

    const tx = {
      to: account.address,
      value: 1n,
    };

    beforeAll(async () => {
      smartAccount = await createSmartAccountClient({
        signer: client,
        bundlerUrl,
        paymasterUrl,
      });
      await requireBalance(smartAccount, valueToSend);
    });

    it("should perform a native transfer without a paymaster", async () => {
      // const receipt = await sendUserOperation(account, smartAccount, false);
      const userOpResponse = await smartAccount.sendTransaction(tx);

      const receipt = await userOpResponse.wait();

      console.log(receipt);

      expect(receipt.success).toBe("true");
    });

    if (paymasterUrl) {
      it("should perform a native transfer using a paymaster", async () => {
        if (!paymasterUrl) {
          throw new Error("AVALANCHE_MAINNET_PAYMASTER_URL is not defined");
        }

        const unestimatedUserOperation: Partial<UserOperationStruct> =
          await smartAccount.signUserOp({
            sender: await smartAccount.getAccountAddress(),
            nonce: await smartAccount.getNonce(),
            initCode: "0x",
            callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
            callGasLimit: 1n,
            verificationGasLimit: 1n,
            preVerificationGas: 1n,
            maxFeePerGas: 1n,
            maxPriorityFeePerGas: 1n,
            paymasterAndData: stubPaymasterAndData,
          });

        const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
          unestimatedUserOperation,
        );

        const {
          callGasLimit,
          verificationGasLimit,
          preVerificationGas,
          maxFeePerGas,
          maxPriorityFeePerGas,
        } = gasEstimate!;

        let estimatedUserOperation = await smartAccount.signUserOp({
          ...unestimatedUserOperation,
          callGasLimit: BigInt(callGasLimit),
          verificationGasLimit: BigInt(verificationGasLimit),
          preVerificationGas: BigInt(preVerificationGas),
          maxFeePerGas: BigInt(maxFeePerGas),
          maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
        });

        estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
          paymasterUrl,
          estimatedUserOperation,
        );

        estimatedUserOperation = await smartAccount.signUserOp(
          estimatedUserOperation,
        );

        const response = await smartAccount.bundler!.sendUserOp(
          estimatedUserOperation,
        );

        const receipt = await response.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });
    }
  });

  describe.skip("bsc-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${bsc.id}/biconomy`;

      const paymasterUrl = process.env.BSC_MAINNET_PAYMASTER_URL;

      const client = createWalletClient({
        account,
        chain: bsc,
        transport: http(),
      });

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: client,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        // const receipt = await sendUserOperation(account, smartAccount, false);
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("AVALANCHE_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${bsc.id}/biconomy`;

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: bsc,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        console.log(receipt);

        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("arbitrum-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${arbitrum.id}/biconomy`;

      const paymasterUrl = process.env.ARBITRUM_MAINNET_PAYMASTER_URL;

      const client = createWalletClient({
        account,
        chain: arbitrum,
        transport: http(),
      });

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: client,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("ARBITRUM_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${arbitrum.id}/test`;

      logConfig(arbitrum.id, bundlerUrl, account, "");

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: arbitrum,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(
          `${arbitrum.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        // console.log(receipt);
        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("polygon-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${polygon.id}/biconomy`;

      const paymasterUrl = process.env.POLYGON_MAINNET_PAYMASTER_URL;

      const client = createWalletClient({
        account,
        chain: polygon,
        transport: http(),
      });

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: client,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("POLYGON_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${polygon.id}/test`;

      logConfig(polygon.id, bundlerUrl, account, "");

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: polygon,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(
          `${polygon.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        console.log(receipt);
        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("gnosis-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${gnosis.id}/test`;

      const paymasterUrl = process.env.GNOSIS_MAINNET_PAYMASTER_URL;

      const client = createWalletClient({
        account,
        chain: gnosis,
        transport: http(),
      });

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: client,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      });

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("GNOSIS_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${gnosis.id}/test`;

      logConfig(gnosis.id, bundlerUrl, account, "");

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: gnosis,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(
          `${gnosis.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        console.log(receipt);
        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("blast-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${blast.id}/biconomy`;

      logConfig(blast.id, bundlerUrl, account, "");

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: blast,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(
          `${blast.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        console.log(receipt);
        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("berachain-bartio", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${berachainTestnetbArtio.id}/biconomy`;

      logConfig(berachainTestnetbArtio.id, bundlerUrl, account, "");

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: berachainTestnetbArtio,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(
          `${berachainTestnetbArtio.name} EPv0.7.0 txHash: ${receipt.transactionHash}`,
        );
        console.log(receipt);
        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.skip("ethereum-sepolia", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    describe.skip("EntryPoint v0.6.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v2/${sepolia.id}/biconomy`;

      const paymasterUrl = process.env.SEPOLIA_MAINNET_PAYMASTER_URL;

      const signer = createWalletClient({
        account,
        chain: sepolia,
        transport: http(),
      }).extend(publicActions);

      let smartAccount: BiconomySmartAccountV2;

      const tx = {
        to: account.address,
        value: 1n,
      };

      beforeAll(async () => {
        smartAccount = await createSmartAccountClient({
          signer: signer,
          bundlerUrl,
          paymasterUrl,
        });
        await requireBalance(smartAccount, valueToSend);
      });

      it("should perform a native transfer without a paymaster", async () => {
        const userOpResponse = await smartAccount.sendTransaction(tx);

        const receipt = await userOpResponse.wait();

        console.log(receipt);

        expect(receipt.success).toBe("true");
      }, 60_000);

      if (paymasterUrl) {
        it("should perform a native transfer using a paymaster", async () => {
          if (!paymasterUrl) {
            throw new Error("SEPOLIA_MAINNET_PAYMASTER_URL is not defined");
          }

          const unestimatedUserOperation: Partial<UserOperationStruct> =
            await smartAccount.signUserOp({
              sender: await smartAccount.getAccountAddress(),
              nonce: await smartAccount.getNonce(),
              initCode: "0x",
              callData: await smartAccount.encodeExecute(tx.to, tx.value, "0x"),
              callGasLimit: 1n,
              verificationGasLimit: 1n,
              preVerificationGas: 1n,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              paymasterAndData: stubPaymasterAndData,
            });

          const gasEstimate = await smartAccount.bundler?.estimateUserOpGas(
            unestimatedUserOperation,
          );

          const {
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
          } = gasEstimate!;

          let estimatedUserOperation = await smartAccount.signUserOp({
            ...unestimatedUserOperation,
            callGasLimit: BigInt(callGasLimit),
            verificationGasLimit: BigInt(verificationGasLimit),
            preVerificationGas: BigInt(preVerificationGas),
            maxFeePerGas: BigInt(maxFeePerGas),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
          });

          estimatedUserOperation.paymasterAndData = await sponsorUserOperation(
            paymasterUrl,
            estimatedUserOperation,
          );

          estimatedUserOperation = await smartAccount.signUserOp(
            estimatedUserOperation,
          );

          const response = await smartAccount.bundler!.sendUserOp(
            estimatedUserOperation,
          );

          const receipt = await response.wait();

          console.log(receipt);

          expect(receipt.success).toBe("true");
        });
      }
    });

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${sepolia.id}/biconomy`;

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: sepolia,
          transport: http(),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });

        console.log(receipt);

        expect(receipt.status).toBe("success");
      });
    });
  });

  describe.only("monad-testnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    const monadTestnetChainId = 10143;

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${monadTestnetChainId}/biconomy`;

      const rpcUrl = process.env.MONAD_TESTNET_RPC_URL;
      if (!rpcUrl) {
        throw new Error("MONAD_TESTNET_RPC_URL is not defined");
      }

      it("should perform a native transfer without a paymaster", async () => {
        try {
          const nexusClient = await createNexusClient({
            signer: account,
            bootStrapAddress: "0x7052eE73e9e9cA6884eb2146cA5c020492E5bB9D",
            factoryAddress: "0xF8524aB72c688069DfFa8B1Cbb6005929B5Aff58",
            validatorAddress: "0xEbc7f5Cff2cABcFdfD65a37A9342240b39A73fcd",
            chain: getCustomChain(
              "Monad Testnet",
              monadTestnetChainId,
              rpcUrl,
              "",
              {
                name: "S",
                symbol: "S",
                decimals: 18,
              },
            ),
            transport: http(rpcUrl),
            bundlerTransport: http(bundlerUrl),
          });

          const smartAccountAddress = nexusClient.account.address;
          console.log(`Nexus address: ${smartAccountAddress}`);

          const hash = await nexusClient.sendTransaction({
            calls: [
              {
                to: smartAccountAddress,
                value: 1n,
              },
            ],
          });

          const receipt = await nexusClient.waitForTransactionReceipt({ hash });
          console.log(receipt);
          expect(receipt.status).toBe("success");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.error(error);
          throw error.message;
        }
      });
    });
  });

  describe.skip("sonic-mainnet", () => {
    const account = privateKeyToAccount(`0x${privateKey}`);

    const sonicMainnetChainId = 146;

    describe("EntryPoint v0.7.0", () => {
      const bundlerUrl = `${bundlerHostname}/api/v3/${sonicMainnetChainId}/biconomy`;

      it("should perform a native transfer without a paymaster", async () => {
        const nexusClient = await createNexusClient({
          signer: account,
          chain: getCustomChain(
            "Sonic Mainnet",
            sonicMainnetChainId,
            "https://rpc.soniclabs.com/",
            "",
            {
              name: "S",
              symbol: "S",
              decimals: 18,
            },
          ),
          transport: http("https://rpc.soniclabs.com/"),
          bundlerTransport: http(bundlerUrl),
        });

        const smartAccountAddress = nexusClient.account.address;
        console.log(`Nexus address: ${smartAccountAddress}`);

        const hash = await nexusClient.sendTransaction({
          calls: [
            {
              to: smartAccountAddress,
              value: 1n,
            },
          ],
        });

        const receipt = await nexusClient.waitForTransactionReceipt({ hash });
        console.log(receipt);
        expect(receipt.status).toBe("success");
      });
    });
  });
});

function logConfig(
  chainId: number,
  bundlerUrl: string,
  account: PrivateKeyAccount,
  paymasterUrl?: string,
) {
  console.log(
    JSON.stringify({
      chainId,
      bundlerUrl,
      paymasterUrl,
      eoaAddress: account.address,
    }),
  );
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

async function sponsorUserOperation(
  paymasterUrl: string,
  estimatedUserOperation: UserOperationStruct,
) {
  try {
    const sponsorUserOperationResponse = await axios.post(paymasterUrl, {
      id: 1,
      jsonrpc: "2.0",
      method: "pm_sponsorUserOperation",
      params: [
        estimatedUserOperation,
        {
          mode: "SPONSORED",
          calculateGasLimits: false,
          expiryDuration: 300,
          sponsorshipInfo: {
            webhookData: {},
            smartAccountInfo: {
              name: "BICONOMY",
              version: "2.0.0",
            },
          },
        },
      ],
    });

    const { paymasterAndData } = sponsorUserOperationResponse.data.result;

    return paymasterAndData;
  } catch (err) {
    const axiosError = err as AxiosError;
    throw new Error(axiosError.message);
  }
}
