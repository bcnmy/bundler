import { RedisCacheService } from "../cache";
import { GasPriceService } from "../gas-price";
import { EVMNetworkService } from "../network";
import { UserOperationType } from "../types";
import { BundlerSimulationService } from "./BundlerSimulationService";
import { AlchemySimulationService, TenderlySimulationService } from "./external-simulation";

describe("BundlerSimulationService", () => {
  const networkService = new EVMNetworkService({ chainId: 137, rpcUrl: "https://best-rpc-url.io"});
  const cacheService = RedisCacheService.getInstance();
  const gasPriceService = new GasPriceService(cacheService, networkService, { chainId: 137, EIP1559SupportedNetworks: [137]});  
  const tenderlySimulationService = new TenderlySimulationService(gasPriceService, cacheService, {
    tenderlyAccessKey: "",
    tenderlyProject: "",
    tenderlyUser: "",
  });
  const alchemySimulationService = new AlchemySimulationService(networkService);
  const bundlerSimulationService = new BundlerSimulationService(
    networkService,
    tenderlySimulationService,
    alchemySimulationService,
    gasPriceService
  );
  
  describe("user op rejection", () => {
    it("user op has insufficient max priority fee per gas", async () => {
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
        signature: "0xsignature"
      };
      bundlerSimulationService.checkUserOperationForRejection({
        userOp
      });
    });

    it("user op has insufficient max fee per gas", async () => {
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
        signature: "0xsignature"
      };
      bundlerSimulationService.checkUserOperationForRejection({
        userOp
      });
    });

    it("user op has insufficient preVerificationGas", async () => {
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
        signature: "0xsignature"
      };
      bundlerSimulationService.checkUserOperationForRejection({
        userOp
      });
    });

    it("user op has sufficient max fee values and preVerificationGas", async () => {
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
        signature: "0xsignature"
      };
      bundlerSimulationService.checkUserOperationForRejection({
        userOp
      });
    });
  });
});
