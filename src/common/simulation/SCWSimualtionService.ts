import { IEVMAccount } from "../../relayer/account";
import { INetworkService } from "../network";
import { EVMRawTransactionType } from "../types";
import { TenderlySimulationService } from "./external-simulation";
import { SimulationDataType, SimulationResponseType } from "./types";

export class SCWSimulationService {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  tenderlySimulationService: TenderlySimulationService;

  constructor(
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    tenderlySimulationService: TenderlySimulationService,
  ) {
    this.networkService = networkService;
    this.tenderlySimulationService = tenderlySimulationService;
  }

  async simulate(
    simulationData: SimulationDataType,
  ): Promise<SimulationResponseType> {
    const tenderlySimulationResponse =
      await this.tenderlySimulationService.simulate(simulationData);
    return tenderlySimulationResponse;
  }
}
