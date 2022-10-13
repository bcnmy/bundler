import axios from 'axios';
import { BaseSimulationDataType, CCMPSimulationDataType, ExternalSimulationResponseType, SCWSimulationDataType } from '../types';
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
    simualtionData: BaseSimulationDataType
  ): Promise<ExternalSimulationResponseType> {
    const {
      chainId, data, to,
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
        rawResponse: response
      };
    }

    return {
      isSimulationSuccessful: true,
      msgFromSimulation: 'Fee options fetched successfully',
      gasLimitFromSimulation: response?.data?.transaction?.gas_used,
      rawResponse: response
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

}
