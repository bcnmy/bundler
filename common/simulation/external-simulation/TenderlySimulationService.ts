import axios from 'axios';
import { IExternalSimulation } from '../interface';
import { ExternalSimulationResponseType, TenderlySimulationDataType } from '../types';
import { logger } from '../../log-config';

const log = logger(module);

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;

export class TenderlySimulationService implements IExternalSimulation {
  static async simulate(
    simualtionData: TenderlySimulationDataType,
  ): Promise<ExternalSimulationResponseType> {
    const {
      chainId, data, wallet, refundInfo, gasPriceMap,
    } = simualtionData;
    const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`;
    const tAxios = TenderlySimulationService.tenderlyInstance();
    const body = {
      // standard TX fields
      network_id: chainId.toString(),
      from: '0xb3d1f43ec5249538c6c0fd4fd6e06b4215ce3000',
      input: data,
      gas: 8000000,
      gas_price: '0',
      value: '0',
      to: wallet,
      // simulation config (tenderly specific)
      save: true,
    };
    const response = await tAxios.post(SIMULATE_URL, body);

    if (!response?.data?.transaction?.status) {
      return {
        code: 400,
        error: response?.data?.transaction?.error_message,
      };
    }

    const transactionLogs = response.data.transaction.transaction_info.call_trace.logs;
    const gasUsedInSimulation = response.data.transaction.transaction_info.call_trace.gas_used
     + response.data.transaction.transaction_info.call_trace.intrinsic_gas;
    const { isRelayerPaidFully, successOrRevertMsg } = await TenderlySimulationService
      .checkIfRelayerIsPaidFully(
        transactionLogs,
        gasUsedInSimulation,
        chainId,
        gasPriceMap,
        refundInfo,
      );

    if (!isRelayerPaidFully) {
      return {
        code: 400,
        error: `Payment to relayer is incorrect, with message: ${successOrRevertMsg}`,
      };
    }

    return {
      code: 200,
      msg: 'Fee options fetched successfully',
      data: [{
        executed: true, succeeded: true, result: '0x', reason: null, gasUsed: response?.data?.transaction?.gas_used, gasLimit: 13079,
      }],
      // resp,
    };
  }

  static tenderlyInstance = () => axios.create({
    headers: {
      'X-Access-Key': TENDERLY_ACCESS_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  static checkIfRelayerIsPaidFully = async (
    transactionLogs: any,
    gasUsedInSimulation: number,
    chainId: number,
    gasPriceMap: any,
    refundInfo: { tokenGasPrice: string, gasToken: string },
  ) => {
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
      const nativeTokenGasPrice = await gasPriceMap[chainId].getGasPrice();

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
  };
}
