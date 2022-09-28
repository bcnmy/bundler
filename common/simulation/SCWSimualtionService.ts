import { EVMAccount } from '../../relayer/src/services/account';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { SCWSimulationDataType, SimulationResponseType } from './types';

export class SCWSimulationService {
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  entryPointAbi: string;

  entryPointAddress: string;

  constructor(
    networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
    options: {
      entryPointAbi: string,
      entryPointAddress: string,
    },
  ) {
    this.networkService = networkService;
    this.entryPointAbi = options.entryPointAbi;
    this.entryPointAddress = options.entryPointAddress;
  }

  async simulate(simulationData: SCWSimulationDataType): Promise<SimulationResponseType> {
    console.log(this.entryPointAbi, simulationData);
    return {
      isSimulationSuccessful: true,
      gasLimitFromSimulation: 500000,
      msgFromSimulation: '',
    };
  }
}
