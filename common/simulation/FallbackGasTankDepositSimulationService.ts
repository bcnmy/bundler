import { ethers } from 'ethers';
import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { logger } from '../log-config';
import { INetworkService } from '../network';
import { EVMRawTransactionType, FallbackGasTankMapType } from '../types';
import { parseError } from '../utils';
import { FallbackGasTankDepositSimualtionParamsType, FallbackGasTankDepositSimulationDataType, SimulationResponseType } from './types';

const log = logger(module);
export class FallbackGasTankDepositSimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  fallbackGasTankMap: FallbackGasTankMapType;

  constructor(
    fallbackGasTankDepositSimulationParams: FallbackGasTankDepositSimualtionParamsType,
  ) {
    const {
      networkService,
      options,
    } = fallbackGasTankDepositSimulationParams;
    this.networkService = networkService;
    this.fallbackGasTankMap = options.fallbackGasTankMap;
  }

  async simulate(
    simulationData: FallbackGasTankDepositSimulationDataType,
  ): Promise<SimulationResponseType> {
    try {
      const {
        chainId,
        value,
        paymasterId,
      } = simulationData;

      const { fallbackGasTankDepositManager } = config;
      const from = fallbackGasTankDepositManager.ownerAccountDetails[chainId].publicKey;
      log.info(`from: ${from} for chainId: ${chainId}, value: ${value}, paymasterId: ${paymasterId}`);

      const {
        address,
        fallbackGasTankContract,
      } = this.fallbackGasTankMap[chainId];

      log.info(`address of fallback gas tank: ${address} for chainId: ${chainId} and paymasterId: ${paymasterId}`);

      const { data } = await (fallbackGasTankContract as ethers.Contract)
        .populateTransaction.depositFor(paymasterId);

      const gasLimitFromSimulation = await this.networkService.estimateCallGas(
        from,
        address,
        data as string,
      );

      log.info(`gasLimitFromSimulation: ${gasLimitFromSimulation} for chainId: ${chainId} and paymasterId: ${paymasterId}`);

      return {
        isSimulationSuccessful: true,
        data: {
          gasLimitFromSimulation,
        },
        message: 'Fallback GasTank Deposit Transaction successfully simulated',
      };
    } catch (error) {
      return {
        isSimulationSuccessful: false,
        data: {
          gasLimitFromSimulation: 0,
        },
        message: `Fallback GasTank Deposit Transaction failed simulation with reason: ${parseError(error)}`,
      };
    }
  }
}
