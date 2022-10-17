import { EVMAccount } from '../../relayer/src/services/account';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { TenderlySimulationService } from './external-simulation';
import { SCWSimulationDataType, SimulationResponseType } from './types';
import { logger } from '../log-config';
import { GasPriceType } from '../gas-price/types';

const log = logger(module);
export class SCWSimulationService {
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  tenderlySimulationService: TenderlySimulationService;

  constructor(
    networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
    tenderlySimulationService: TenderlySimulationService,
  ) {
    this.networkService = networkService;
    this.tenderlySimulationService = tenderlySimulationService;
  }

  async simulate(simulationData: SCWSimulationDataType): Promise<SimulationResponseType> {
    const tenderlySimulationResult = await this.tenderlySimulationService.simulate(simulationData);
    
    const transactionLogs = tenderlySimulationResult.rawResponse.data.transaction.transaction_info.call_trace.logs;
    const gasUsedInSimulation = tenderlySimulationResult.rawResponse.data.transaction.transaction_info.call_trace.gas_used
     + tenderlySimulationResult.rawResponse.data.transaction.transaction_info.call_trace.intrinsic_gas;
    const { isRelayerPaidFully, successOrRevertMsg } = await this.checkIfRelayerIsPaidFully(
      transactionLogs,
      gasUsedInSimulation,
      simulationData.chainId,
      simulationData.refundInfo,
    );

    if (!isRelayerPaidFully) {
      return {
        isSimulationSuccessful: false,
        msgFromSimulation: `Payment to relayer is incorrect, with message: ${successOrRevertMsg}`,
        gasLimitFromSimulation: 0
      };
    }

    return tenderlySimulationResult;
  }

  private async checkIfRelayerIsPaidFully(
    transactionLogs: any,
    gasUsedInSimulation: number,
    chainId: number,
    refundInfo: { tokenGasPrice: string, gasToken: string },
  ) {
    try {
      log.info(`Refund info received: ${refundInfo}`);
      const executionSuccessLog = transactionLogs.find((transactionLog: any) => transactionLog.name === 'ExecutionSuccess');
      if (!executionSuccessLog) {
        return {
          isRelayerPaidFully: false,
          successOrRevertMsg: 'ExecutionSuccess event not found in simulation logs',
        };
      }
      const paymentEventData = executionSuccessLog.inputs.find((input: any) => input.soltype.name === 'payment');
      if (!paymentEventData) {
        return {
          isRelayerPaidFully: false,
          successOrRevertMsg: 'Payment data not found in ExecutionSuccess simulation logs',
        };
      }
      const paymentValue = paymentEventData.value;
      if (!paymentValue) {
        return {
          isRelayerPaidFully: false,
          successOrRevertMsg: 'Payment value not found in payment event data',
        };
      }
      log.info(`Payment sent in transaction: ${paymentValue}`);

      let refundToRelayer: number;
      const gasPrice = await this.tenderlySimulationService.gasPriceService.getGasPrice(GasPriceType.DEFAULT);
      // TODO // Review how to calculate this
      const nativeTokenGasPrice = parseInt(gasPrice as string, 10);

      log.info(`Native token gas price: ${nativeTokenGasPrice}`);
      // ERC 20 token gas price should be in units of native asset
      // TODO get price feeds
      const erc20TokenGasPrice = parseInt(refundInfo.tokenGasPrice, 10);
      if (refundInfo.gasToken === '0x0000000000000000000000000000000000000000') {
        refundToRelayer = paymentValue * nativeTokenGasPrice;
      } else {
        // decimals
        // paymentValue is in smallest unit?
        refundToRelayer = paymentValue * erc20TokenGasPrice;
      }

      log.info(`Refund being sent to relayer in the transaction: ${refundToRelayer}`);
      log.info(`Asset consumption calculated from simulation: ${gasUsedInSimulation * nativeTokenGasPrice}`);

      if (!(refundToRelayer < gasUsedInSimulation * nativeTokenGasPrice)) {
        return {
          isRelayerPaidFully: false,
          successOrRevertMsg: `Refund to relayer: ${refundToRelayer} is less than what will be consumed in the transaction: ${gasUsedInSimulation * nativeTokenGasPrice}`,
        };
      }
      return {
        isRelayerPaidFully: true,
        successOrRevertMsg: `Refund to relayer: ${refundToRelayer} is sufficient to send the transaction`,
      };
    } catch (error) {
      log.info(error);
      return {
        isRelayerPaidFully: false,
        successOrRevertMsg: `Something went wrong with error: ${error}`,
      };
    }
  }
}
