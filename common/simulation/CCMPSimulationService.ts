import { logger } from '../log-config';
import { config } from '../../config';
import type { ETHCallSimulationService } from './external-simulation/EthCallSimulationService';
import type { ISimulationService } from './interface';
import type { CCMPSimulationResponseType, CCMPSimulationDataType } from './types';
import type { ICCMPGatewayService } from '../../server/src/services/cross-chain/gateway/interfaces/ICCMPGatewayService';

const log = logger(module);

export class CCMPSimulationService
implements ISimulationService<CCMPSimulationDataType, CCMPSimulationResponseType> {
  private readonly simulationOverridesMap: Record<string, { [address: string]: { code: string } }>;

  private readonly verficationDataMap: Record<string, string>;

  private readonly ccmpGatewayAddress: string;

  constructor(
    private readonly chainId: number,
    private readonly ethCallSimulationService: ETHCallSimulationService,
    private readonly ccmpGatewayService: ICCMPGatewayService,
  ) {
    const supportedRouters = config.ccmp.supportedRouters[this.chainId];
    const adaptorAddresses = config.ccmp.adaptors[this.chainId];
    const estimationDataMap = config.ccmp.gasEstimation;
    this.simulationOverridesMap = Object.fromEntries(
      supportedRouters.map((routerName) => [
        routerName,
        { [adaptorAddresses[routerName]]: { code: estimationDataMap[routerName].code } },
      ]),
    );
    this.verficationDataMap = Object.fromEntries(
      supportedRouters.map((routerName) => [
        routerName,
        estimationDataMap[routerName].verificationData,
      ]),
    );
    this.ccmpGatewayAddress = config.ccmp.contracts[this.chainId].CCMPGateway;
  }

  async simulate(simulationData: CCMPSimulationDataType): Promise<CCMPSimulationResponseType> {
    const { ccmpMessage: message } = simulationData;
    log.info(`Simulating CCMP message: ${JSON.stringify(message)}`);
    const overrides = this.simulationOverridesMap[message.routerAdaptor];
    if (!overrides) {
      throw new Error(
        `Unsupported router adaptor for simulation: ${message.routerAdaptor} on chain ${this.chainId}`,
      );
    }
    const verificationData = this.verficationDataMap[message.routerAdaptor];
    const calldata = this.ccmpGatewayService.buildReceiveMessageCalldata(message, verificationData);

    const estimate = this.ethCallSimulationService.simulate({
      estimationCalldata: calldata,
      contractAddress: this.ccmpGatewayAddress,
      overrides,
      tag: 'latest',
    });

    return estimate;
  }
}
