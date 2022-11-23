import { BytesLike, ethers } from 'ethers';
import type { IGasPrice } from '../../gas-price';
import { logger } from '../../log-config';
import type { EVMNetworkService } from '../../network';
import type { IExternalSimulation } from '../interface';
import type { EthCallSimulationDataType, EthCallSimulationResponseType } from '../types';

const log = logger(module);

export class ETHCallSimulationService
implements IExternalSimulation<EthCallSimulationDataType, EthCallSimulationResponseType> {
  private readonly estimatorInterface: ethers.utils.Interface;

  constructor(
    private readonly chainId: number,
    private readonly estimatorAddress: string,
    private readonly abi: Record<string, any>[],
    private readonly networkService: EVMNetworkService,
    readonly gasPriceService: IGasPrice,
  ) {
    this.estimatorInterface = new ethers.utils.Interface(abi);
  }

  private getEstimatorContractCalldata(contractAddressToEstimate: string, calldata: string) {
    return this.estimatorInterface.encodeFunctionData('estimate', [
      contractAddressToEstimate,
      calldata,
    ]);
  }

  private static decodeError(bytes: BytesLike): string {
    try {
      let errorMessage = ethers.utils.toUtf8String(
        `0x${ethers.utils.hexlify(bytes).substring(138)}`,
      );
      // errorMessage may have special character and for this reason we want them to be removed
      errorMessage = errorMessage.replace(/[^a-zA-Z0-9 ]/g, '');
      return errorMessage;
    } catch (e) {
      return 'UNKNOWN_ERROR';
    }
  }

  private static txBaseCost(data: string): number {
    const options = {
      dataZeroCost: 4,
      dataOneCost: 16,
      baseCost: 21000,
    };
    const bytes = ethers.utils.arrayify(data);
    return bytes
      .reduce(
        (p, c) => (c === 0 ? p.add(options.dataZeroCost) : p.add(options.dataOneCost)),
        ethers.constants.Zero,
      )
      .add(options.baseCost)
      .toNumber();
  }

  async simulate(
    simulationData: EthCallSimulationDataType,
  ): Promise<EthCallSimulationResponseType> {
    try {
      log.info(`Simulating eth_call transaction with data: ${JSON.stringify(simulationData)}`);
      const data = this.getEstimatorContractCalldata(
        simulationData.contractAddress,
        simulationData.estimationCalldata,
      );
      const params = [
        {
          from: simulationData.from,
          gas: simulationData.gas,
          gasPrice: simulationData.gasPrice,
          value: simulationData.value,
          to: this.estimatorAddress,
          data,
        },
        simulationData.tag,
        simulationData.overrides || {},
      ];
      log.info(`eth_call params: ${JSON.stringify(params)}`);
      const response = await this.networkService.sendRpcCall('eth_call', params);
      const encodedResult = response.data.result;
      if (!encodedResult) {
        throw new Error('No result returned from eth_call');
      }
      log.info(`eth_call result: ${encodedResult}`);
      const { success, result, gas } = this.estimatorInterface.decodeFunctionResult(
        'estimate',
        encodedResult,
      );
      if (!success) {
        const errorMessage = ETHCallSimulationService.decodeError(result);
        throw new Error(`Error in simulation: ${JSON.stringify(errorMessage)}`);
      }

      const simulationResult = {
        isSimulationSuccessful: true,
        gasEstimateFromSimulation: gas.toNumber(),
        txBaseGasEstimate: ETHCallSimulationService.txBaseCost(data),
      };
      log.info(`Simulation result: ${JSON.stringify(simulationResult)}`);
      return simulationResult;
    } catch (e) {
      log.error(`Error in eth_call simulation: ${e}`);
      return {
        isSimulationSuccessful: false,
        gasEstimateFromSimulation: 0,
        txBaseGasEstimate: 0,
        err: e instanceof Error ? e.message : JSON.stringify(e),
      };
    }
  }
}
