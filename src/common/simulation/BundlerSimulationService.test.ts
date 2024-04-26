import { GasEstimator } from "entry-point-gas-estimations/dist/gas-estimator/entry-point-v6/GasEstimator/GasEstimator";
import { config } from "../../config";
import { GasPriceService } from "../gas-price";
import { EVMNetworkService } from "../network";
import { UserOperationType } from "../types";
import { BundlerSimulationService } from "./BundlerSimulationService";
import RpcError from "../utils/rpc-error";
import { checkUserOperationForRejection } from "./utils";

describe("BundlerSimulationService", () => {
  const networkService = new EVMNetworkService({ chainId: 137, rpcUrl: "https://random-rpc-url.com"});
  const gasPriceService = {} as unknown as GasPriceService;
  const bundlerSimulationService = new BundlerSimulationService(
    networkService,
    gasPriceService,
  );

  describe("user op rejection", () => {
    it("user op has insufficient max priority fee per gas", async () => {
      bundlerSimulationService.gasEstimator = {
        calculatePreVerificationGas: jest.fn().mockResolvedValue(50000n),
      } as unknown as GasEstimator;

      const networkMaxFeePerGas = 10n;
      const networkMaxPriorityFeePerGas = 10n;

      const userOp: UserOperationType = {
        sender: "0xabc",
        nonce: 1n,
        initCode: "0x",
        callData: "0xdef",
        paymasterAndData: "0x",
        callGasLimit: 5000n,
        verificationGasLimit: 5000n,
        preVerificationGas: 5000n,
        maxPriorityFeePerGas: 1n,
        maxFeePerGas: 10n,
        signature: "0xsignature",
      };

      try {
        await checkUserOperationForRejection({
          userOp,
          networkMaxFeePerGas,
          networkMaxPriorityFeePerGas,
          networkPreVerificationGas: 0n,
          maxPriorityFeePerGasThresholdPercentage: 0,
          maxFeePerGasThresholdPercentage: 0,
          preVerificationGasThresholdPercentage: 0
        });
      } catch (error) {
        expect((error as RpcError).message).toEqual(
          `maxPriorityFeePerGas in userOp: ${userOp.maxPriorityFeePerGas} is lower than expected maxPriorityFeePerGas: ${Number(networkMaxPriorityFeePerGas) * config.maxPriorityFeePerGasThresholdPercentage}`,
        );
      }
    });

    it("user op has insufficient max fee per gas", async () => {
      bundlerSimulationService.gasEstimator = {
        calculatePreVerificationGas: jest.fn().mockResolvedValue(50000n),
      } as unknown as GasEstimator;

      const networkMaxFeePerGas = 10n;
      const networkMaxPriorityFeePerGas = 10n;

      const userOp: UserOperationType = {
        sender: "0xabc",
        nonce: 1n,
        initCode: "0x",
        callData: "0xdef",
        paymasterAndData: "0x",
        callGasLimit: 5000n,
        verificationGasLimit: 5000n,
        preVerificationGas: 5000n,
        maxPriorityFeePerGas: 20n,
        maxFeePerGas: 1n,
        signature: "0xsignature",
      };
      try {
        await checkUserOperationForRejection({
          userOp,
          networkMaxFeePerGas,
          networkMaxPriorityFeePerGas,
          networkPreVerificationGas: 0n,
          maxPriorityFeePerGasThresholdPercentage: 0,
          maxFeePerGasThresholdPercentage: 0,
          preVerificationGasThresholdPercentage: 0
        });
      } catch (error) {
        expect((error as RpcError).message).toEqual(
          `maxFeePerGas in userOp: ${userOp.maxFeePerGas} is lower than expected maxFeePerGas: ${Number(networkMaxFeePerGas) * config.maxFeePerGasThresholdPercentage}`,
        );
      }
    });

    it("user op has insufficient preVerificationGas", async () => {
      bundlerSimulationService.gasEstimator = {
        calculatePreVerificationGas: jest.fn().mockResolvedValue(50000n),
      } as unknown as GasEstimator;

      const networkMaxFeePerGas = 1n;
      const networkMaxPriorityFeePerGas = 1n;

      const userOp: UserOperationType = {
        sender: "0xabc",
        nonce: 1n,
        initCode: "0x",
        callData: "0xdef",
        paymasterAndData: "0x",
        callGasLimit: 5000n,
        verificationGasLimit: 5000n,
        preVerificationGas: 5000n,
        maxPriorityFeePerGas: 10n,
        maxFeePerGas: 10n,
        signature: "0xsignature",
      };
      try {
        checkUserOperationForRejection({
          userOp,
          networkMaxFeePerGas,
          networkMaxPriorityFeePerGas,
          networkPreVerificationGas: 0n,
          maxPriorityFeePerGasThresholdPercentage: 0,
          maxFeePerGasThresholdPercentage: 0,
          preVerificationGasThresholdPercentage: 0
        });
      } catch (error) {
        expect((error as RpcError).message).toEqual(
          `preVerificationGas in userOp: ${userOp.preVerificationGas} is lower than expected preVerificationGas: ${50000 * config.preVerificationGasThresholdPercentage}`,
        );
      }
    });

    it("user op has sufficient max fee values and preVerificationGas", async () => {
      bundlerSimulationService.gasEstimator = {
        calculatePreVerificationGas: jest.fn().mockResolvedValue(5n),
      } as unknown as GasEstimator;

      const networkMaxFeePerGas = 1n;
      const networkMaxPriorityFeePerGas = 1n;

      const userOp: UserOperationType = {
        sender: "0xabc",
        nonce: 1n,
        initCode: "0x",
        callData: "0xdef",
        paymasterAndData: "0x",
        callGasLimit: 5000n,
        verificationGasLimit: 5000n,
        preVerificationGas: 5000n,
        maxPriorityFeePerGas: 10n,
        maxFeePerGas: 10n,
        signature: "0xsignature",
      };
      const response =
        await checkUserOperationForRejection({
          userOp,
          networkMaxFeePerGas,
          networkMaxPriorityFeePerGas,
          networkPreVerificationGas: 0n,
          maxPriorityFeePerGasThresholdPercentage: 0,
          maxFeePerGasThresholdPercentage: 0,
          preVerificationGasThresholdPercentage: 0
        });
      expect(response).toBe(true);
    });
  });
});
