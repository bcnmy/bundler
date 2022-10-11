import axios from 'axios';
import { ExternalSimulationResponseType, SCWSimulationDataType } from '../types';
import { logger } from '../../log-config';
import { IGasPrice } from '../../gas-price';
import { GasPriceType } from '../../gas-price/types';
import { IExternalSimulation } from '../interface';

const log = logger(module);

export class TenderlySimulationService implements IExternalSimulation {
  gasPriceService: IGasPrice;

  private tenderlyUser: string;

  private tenderlyProject: string;

  private tenderlyAccessKey: string;

  constructor(gasPriceService: IGasPrice, options: {
    tenderlyUser: string,
    tenderlyProject: string,
    tenderlyAccessKey: string,
  }) {
    this.gasPriceService = gasPriceService;
    this.tenderlyUser = options.tenderlyUser;
    this.tenderlyProject = options.tenderlyProject;
    this.tenderlyAccessKey = options.tenderlyAccessKey;
  }

  async simulate(
    simualtionData: SCWSimulationDataType,
  ): Promise<ExternalSimulationResponseType> {
    const {
      chainId, data, to, refundInfo,
    } = simualtionData;
    const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${this.tenderlyUser}/project/${this.tenderlyProject}/simulate`;
    const tAxios = this.tenderlyInstance();
    const body = {
      // standard TX fields
      network_id: chainId.toString(),
      from: '0xb3d1f43ec5249538c6c0fd4fd6e06b4215ce3000',
      input: data,
      gas: 8000000,
      gas_price: '0',
      value: '0',
      to,
      // simulation config (tenderly specific)
      save: true,
    };
    const response = await tAxios.post(SIMULATE_URL, body);

    if (!response?.data?.transaction?.status) {
      return {
        isSimulationSuccessful: false,
        msgFromSimulation: response?.data?.transaction?.error_message,
        gasLimitFromSimulation: 0,
      };
    }

    const transactionLogs = response.data.transaction.transaction_info.call_trace.logs;
    const gasUsedInSimulation = response.data.transaction.transaction_info.call_trace.gas_used
     + response.data.transaction.transaction_info.call_trace.intrinsic_gas;
    const { isRelayerPaidFully, successOrRevertMsg } = await this.checkIfRelayerIsPaidFully(
      transactionLogs,
      gasUsedInSimulation,
      chainId,
      refundInfo,
    );

    if (!isRelayerPaidFully) {
      return {
        isSimulationSuccessful: false,
        msgFromSimulation: `Payment to relayer is incorrect, with message: ${successOrRevertMsg}`,
        gasLimitFromSimulation: 0,
      };
    }

    return {
      isSimulationSuccessful: true,
      msgFromSimulation: 'Fee options fetched successfully',
      gasLimitFromSimulation: response?.data?.transaction?.gas_used,
    };
  }

  private tenderlyInstance() {
    return axios.create({
      headers: {
        'X-Access-Key': this.tenderlyAccessKey || '',
        'Content-Type': 'application/json',
      },
    });
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
      const gasPrice = await this.gasPriceService.getGasPrice(GasPriceType.DEFAULT);
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
