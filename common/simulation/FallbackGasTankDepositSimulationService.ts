import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { parseError } from '../utils';
import { FallbackGasTankDepositSimulationDataType, SimulationResponseType } from './types';

export class FallbackGasTankDepositSimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  ) {
    this.networkService = networkService;
  }

  async simulate(
    simulationData: FallbackGasTankDepositSimulationDataType,
  ): Promise<SimulationResponseType> {
    try {
      const {
        chainId,
        value,
        to,
      } = simulationData;
      const { fallbackGasTankDepositManager } = config;
      const from = fallbackGasTankDepositManager.ownerAccountDetails[chainId].publicKey;
      const gasLimitFromSimulation = await this.networkService.sendRpcCall('eth_estimateGas', [{
        from,
        to,
        value,
      }]);

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
        message: `Fallback GasTank Deposit Transaction failed simulattion with reason: ${parseError(error)}`,
      };
    }
  }
}
