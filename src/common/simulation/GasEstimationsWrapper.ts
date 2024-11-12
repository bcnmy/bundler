import {
  CalculatePreVerificationGas,
  CalculatePreVerificationGasParams,
  createArbitrumGasEstimator,
  createGasEstimator,
  createKakarotGasEstimator,
  createMantleGasEstimator,
  createMorphGasEstimator,
  createOptimismGasEstimator,
  createScrollGasEstimator,
  createSeiGasEstimator,
  EstimateUserOperationGas,
  EstimateUserOperationGasParams,
} from "entry-point-gas-estimations/dist/gas-estimator/entry-point-v6";
import { SimulationGasEstimator } from "./BundlerSimulationService";
import config from "config";
import { hideRpcUrlApiKey } from "../network/utils";

/**
 * The following is the adapter for the gas estimations class exposed by the entry-point-gas-estimations package.
 * Because the original class is not designed properly, we wrap it with this adapter to make it more usable.
 */
export class GasEstimationsAdapter implements SimulationGasEstimator {
  public readonly chainId: number;
  public readonly rpcUrl: string;

  private wrappedGasEstimator: {
    estimator: SimulationGasEstimator;
    type: estimatorTypeChoices;
  };

  constructor({
    chainId,
    rpcUrl,
    gasEstimator = factoryCreateGasEstimator({ chainId, rpcUrl }),
  }: IGasEstimationsAdapterOptions) {
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    this.wrappedGasEstimator = gasEstimator;
  }

  /**
   * Used for pretty printing the service configuration
   * @returns JSON stringified object with API keys removed
   */
  toJSON(): Omit<IGasEstimationsAdapterOptions, "gasEstimator"> & {
    type: estimatorTypeChoices;
  } {
    return {
      chainId: this.chainId,
      rpcUrl: hideRpcUrlApiKey(this.rpcUrl),
      type: this.wrappedGasEstimator.type,
    };
  }

  setEntryPointAddress(entryPointAddress: `0x${string}`): void {
    return this.wrappedGasEstimator.estimator.setEntryPointAddress(
      entryPointAddress,
    );
  }

  estimateUserOperationGas(
    params: EstimateUserOperationGasParams,
  ): Promise<EstimateUserOperationGas> {
    return this.wrappedGasEstimator.estimator.estimateUserOperationGas(params);
  }

  calculatePreVerificationGas(
    params: CalculatePreVerificationGasParams,
  ): Promise<CalculatePreVerificationGas> {
    return this.wrappedGasEstimator.estimator.calculatePreVerificationGas(
      params,
    );
  }
}

/**
 * A Factory Method for creating the nested gas estimators based on the chainId
 */
const factoryCreateGasEstimator = ({
  chainId,
  rpcUrl,
}: IGasEstimationsAdapterOptions): {
  estimator: SimulationGasEstimator;
  type: estimatorTypeChoices;
} => {
  if (config.get<number[]>("optimismNetworks").includes(chainId)) {
    return {
      estimator: createOptimismGasEstimator({
        rpcUrl,
      }),
      type: "optimism",
    };
  }

  if (config.get<number[]>("arbitrumNetworks").includes(chainId)) {
    return {
      estimator: createArbitrumGasEstimator({
        rpcUrl,
      }),
      type: "arbitrum",
    };
  }

  if (config.get<number[]>("mantleNetworks").includes(chainId)) {
    return {
      estimator: createMantleGasEstimator({
        rpcUrl,
      }),
      type: "mantle",
    };
  }

  if (config.get<number[]>("scrollNetworks").includes(chainId)) {
    return {
      estimator: createScrollGasEstimator({
        rpcUrl,
      }),
      type: "scroll",
    };
  }

  if (config.get<number[]>("morphNetworks").includes(chainId)) {
    return {
      estimator: createMorphGasEstimator({
        rpcUrl,
      }),
      type: "morph",
    };
  }

  if (config.get<number[]>("seiNetworks").includes(chainId)) {
    return {
      estimator: createSeiGasEstimator({
        rpcUrl,
      }),
      type: "sei",
    };
  }

  if (config.get<number[]>("kakarotNetworks").includes(chainId)) {
    return {
      estimator: createKakarotGasEstimator({
        rpcUrl,
      }),
      type: "kakarot",
    };
  }

  return {
    estimator: createGasEstimator({
      rpcUrl,
    }),
    type: "regular",
  };
};

interface IGasEstimationsAdapterOptions {
  chainId: number;
  rpcUrl: string;
  gasEstimator?: {
    estimator: SimulationGasEstimator;
    type: estimatorTypeChoices;
  };
}

type estimatorTypeChoices =
  | "regular"
  | "optimism"
  | "arbitrum"
  | "mantle"
  | "scroll"
  | "morph"
  | "sei"
  | "kakarot";
