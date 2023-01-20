import axios from 'axios';
import Big from 'big.js';
import { ExternalSimulationResponseType, SimulationDataType } from '../types';
import { logger } from '../../log-config';
import { IGasPrice } from '../../gas-price';
import { GasPriceType } from '../../gas-price/types';
import { IExternalSimulation } from '../interface';
import { getTokenPriceKey, parseError } from '../../utils';
import { config } from '../../../config';
import { ICacheService } from '../../cache';

const log = logger(module);
// TODO Remove hard coded values from this class
export class TenderlySimulationService implements IExternalSimulation {
  gasPriceService: IGasPrice;

  cacheService: ICacheService;

  private tenderlyUser: string;

  private tenderlyProject: string;

  private tenderlyAccessKey: string;

  constructor(gasPriceService: IGasPrice, cacheService: ICacheService, options: {
    tenderlyUser: string,
    tenderlyProject: string,
    tenderlyAccessKey: string,
  }) {
    this.gasPriceService = gasPriceService;
    this.cacheService = cacheService;
    this.tenderlyUser = options.tenderlyUser;
    this.tenderlyProject = options.tenderlyProject;
    this.tenderlyAccessKey = options.tenderlyAccessKey;
  }

  async simulate(
    simualtionData: SimulationDataType,
  ): Promise<ExternalSimulationResponseType> {
    const {
      chainId, data, to, refundInfo,
    } = simualtionData;
    log.info(`Sending request to tenderly to run simulation to address: ${to} with data: ${data}`);
    const SIMULATE_URL = `https://api.tenderly.co/api/v1/account/${this.tenderlyUser}/project/${this.tenderlyProject}/simulate`;
    const tAxios = this.tenderlyInstance();

    const gasPriceForSimulation = await this.gasPriceService.getGasPriceForSimulation();
    log.info(`Gas price to be used in simulation: ${gasPriceForSimulation}`);
    const body = {
      // standard TX fields
      network_id: chainId.toString(),
      from: '0x9e1980070743cb86bdbe3ae1d01018c6e97b0932',
      input: data,
      gas: 8000000,
      gas_price: gasPriceForSimulation.toString(),
      value: '0',
      to,
      // simulation config (tenderly specific)
      save: true,
    };
    let response;
    try {
      response = await tAxios.post(SIMULATE_URL, body);
    } catch (error) {
      log.info(`Error in Tenderly Simulation: ${JSON.stringify(error)}`);
      return {
        isSimulationSuccessful: false,
        message: `Error in Tenderly Simulation: ${parseError(error)}`,
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }
    log.info(`Response from Tenderly: ${JSON.stringify(response)}`);
    if (!response?.data?.transaction?.status) {
      return {
        isSimulationSuccessful: false,
        message: response?.data?.transaction?.error_message,
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }

    const transactionLogs = response.data.transaction.transaction_info.call_trace.logs;
    const gasUsedInSimulation = response.data.transaction.transaction_info.call_trace.gas_used
     + response.data.transaction.transaction_info.call_trace.intrinsic_gas;

    if (!refundInfo || Object.keys(refundInfo).length === 0) {
      return {
        isSimulationSuccessful: true,
        message: 'Simulation successful',
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }
    const {
      isRelayerPaidFully,
      successOrRevertMsg,
      refundAmountData,
    } = await this.checkIfRelayerIsPaidFully(
      transactionLogs,
      gasUsedInSimulation,
      refundInfo,
      to,
      chainId,
      data,
    );

    log.info(`isRelayerPaidFully: ${isRelayerPaidFully} for SCW: ${to} with data: ${data}`);

    if (!isRelayerPaidFully) {
      return {
        isSimulationSuccessful: false,
        message: `Payment to relayer is incorrect, with message: ${successOrRevertMsg}`,
        data: {
          refundAmount: 0,
          refundAmountInUSD: 0,
          gasLimitFromSimulation: 0,
        },
      };
    }

    const gasLimitFromSimulation = response?.data?.transaction?.gas_used;
    return {
      isSimulationSuccessful: true,
      message: 'SimulationSuccesful',
      data: {
        refundAmount: refundAmountData?.refundAmount,
        refundAmountInUSD: refundAmountData?.refundAmountInUSD,
        gasLimitFromSimulation,
      },
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

  static convertGasPriceToUSD = async (
    nativeChainId: number,
    gasPrice: number,
    chainPriceDataInUSD: number,
    token: string,
  ) => {
    log.info(`Converting gas price to USD for chain ${nativeChainId} and token ${token} with gas price ${gasPrice} and chain price data in USD ${chainPriceDataInUSD}`);
    const decimal = config.chains.decimal[nativeChainId] || 18;
    const offset = config.feeOption.offset[nativeChainId][token] || 1;
    const usdc = new Big(gasPrice)
      .mul(new Big(chainPriceDataInUSD))
      .div(new Big(10 ** decimal))
      .mul(new Big(offset))
      .toString();
    return usdc;
  };

  private async checkIfRelayerIsPaidFully(
    transactionLogs: any,
    gasUsedInSimulation: number,
    refundInfo: { tokenGasPrice: string, gasToken: string },
    to: string,
    chainId: number,
    data: string,
  ) {
    try {
      log.info(`Refund info received: ${JSON.stringify(refundInfo)}`);
      log.info(`Checking if relayer is being paid fully for SCW: ${to} with data: ${data}`);
      const walletHandlePaymentLog = transactionLogs.find((transactionLog: any) => transactionLog.name === 'WalletHandlePayment');
      if (!walletHandlePaymentLog) {
        return {
          isRelayerPaidFully: false,
          successOrRevertMsg: 'WalletHandlePayment event not found in simulation logs',
        };
      }

      const paymentEventData = walletHandlePaymentLog.inputs.find((input: any) => input.soltype.name === 'payment');
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
      log.info(`Payment sent in transaction: ${paymentValue} for SCW: ${to} with data: ${data}`);

      let refundToRelayer: number;
      // TODO will have to change in EIP 1559 implementation
      const gasPrice = await this.gasPriceService.getGasPrice(GasPriceType.DEFAULT);

      const nativeTokenGasPrice = parseInt(gasPrice as string, 10);

      log.info(`Native token gas price: ${nativeTokenGasPrice} for SCW: ${to} with data: ${data}`);
      // ERC 20 token gas price should be in units of native asset
      const erc20TokenGasPrice = parseInt(refundInfo.tokenGasPrice, 10);
      let refundCalculatedInSimualtion: number = 0;
      if (refundInfo.gasToken === '0x0000000000000000000000000000000000000000') {
        refundToRelayer = Number(paymentValue) * nativeTokenGasPrice;
        refundCalculatedInSimualtion = gasUsedInSimulation * nativeTokenGasPrice;
      } else {
        // decimals
        // paymentValue is in smallest unit?
        refundToRelayer = Number(paymentValue) * erc20TokenGasPrice;
        refundCalculatedInSimualtion = gasUsedInSimulation * erc20TokenGasPrice;
      }

      log.info(`Refund being sent to relayer in the transaction: ${refundToRelayer} for SCW: ${to} with data: ${data}`);
      log.info(`Asset consumption calculated from simulation: ${refundCalculatedInSimualtion} for SCW: ${to} with data: ${data}`);

      if ((Number(refundToRelayer) < Number(refundCalculatedInSimualtion))) {
        return {
          isRelayerPaidFully: false,
          successOrRevertMsg: `Refund to relayer: ${refundToRelayer} is less than what will be consumed in the transaction: ${gasUsedInSimulation * nativeTokenGasPrice}`,
        };
      }

      const networkPriceDataInString = await this.cacheService.get(
        getTokenPriceKey(),
      );
      let networkPriceData;
      if (!networkPriceDataInString) {
        log.error('Network price data not found');
        // TODO remove this hardcoded value. Think better solution
        networkPriceData = {
          1: '1278.43', 5: '1278.43', 137: '0.80', 80001: '0.80', 97: '289.87', 420: '1278.43', 421613: '1278.43', 43113: '13.17',
        };
      } else {
        networkPriceData = JSON.parse(networkPriceDataInString);
      }
      const chainPriceDataInUSD = networkPriceData[chainId];

      let erc20TokenCurrency = '';

      const tokenContractAddresses = config.feeOption.tokenContractAddress[chainId];
      for (const currency of Object.keys(tokenContractAddresses)) {
        if (refundInfo.gasToken.toLowerCase() === tokenContractAddresses[currency].toLowerCase()) {
          erc20TokenCurrency = currency;
        }
      }

      const refundAmountInUSD = await TenderlySimulationService.convertGasPriceToUSD(
        chainId,
        nativeTokenGasPrice,
        chainPriceDataInUSD,
        erc20TokenCurrency,
      );
      return {
        isRelayerPaidFully: true,
        successOrRevertMsg: `Refund to relayer: ${refundToRelayer} is sufficient to send the transaction`,
        refundAmountData: {
          refundAmount: paymentValue,
          refundAmountInUSD: Number(refundAmountInUSD) as any,
        },
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
