import { ethers } from 'ethers';
import { config } from '../../../config';
import { logger } from '../../../log-config';
import { getForwarderDefaultDomainDataKey } from '../../utils/cache-utils';
import {
  domainType,
  forwarderDomainType,
  forwardRequestType,
  daiPermitType,
  eip2612PermitType,
} from '../../utils/eip712-utils';
import { cache } from '../caching';
import { ISystemInfo, SystemInfoData } from './interface/system-info';

const log = logger(module);

export type DomainData = {
  name:string,
  version:string,
  verifyingContract:string,
  salt:string
};

export enum ContractMetaTransactionType {
  DEFAULT = 'CUSTOM',
  EIP2771 = 'TRUSTED_FORWARDER',
  FORWARD = 'ERC20_FORWARDER',
}

export class SystemInfo implements ISystemInfo {
  // network: Network;

  networkId: number;

  system_info_config: any = config.system_info_config;

  forwarderDomainData: DomainData;

  constructor(networkId:number) {
    // this.network = network;
    this.networkId = networkId;
    this.forwarderDomainData = {
      name: config.forwarderDomainName,
      version: config.forwarderVersion,
      verifyingContract: this.system_info_config
        .biconomyForwarderAddressMap[this.networkId],
      salt: ethers.utils.hexZeroPad((ethers.BigNumber.from(this.networkId)).toHexString(), 32),
    };
  }

  async get() {
    log.info(`Fetching system info for network Id ${this.networkId}`);
    try {
      const systemInfo: SystemInfoData = { data: {} };
      const biconomyForwarderAddress = this.system_info_config
        .biconomyForwarderAddressMap[this.networkId];
      const biconomyForwarderAddresses = this.system_info_config
        .biconomyForwarderAddressesMap[this.networkId];
      log.info(`biconomyForwarderAddresses for network Id ${this.networkId} is ${biconomyForwarderAddresses}`);
      const erc20ForwarderAddress = this.system_info_config
        .erc20ForwarderAddressMap[this.networkId];
      const oracleAggregatorAddress = this.system_info_config
        .oracleAggregatorAddressMap[this.networkId];
      const transferHandlerAddress = this.system_info_config
        .transferHandlerAddressMap[this.networkId];
      const daiTokenAddress = this.system_info_config
        .daiTokenAddressMap[this.networkId];
      const usdtTokenAddress = this.system_info_config
        .usdtTokenAddressMap[this.networkId];
      const usdcTokenAddress = this.system_info_config
        .usdcTokenAddressMap[this.networkId];
      const walletFactoryAddress = this.system_info_config.walletFactoryAddressMap[this.networkId];
      const baseWalletAddress = this.system_info_config.baseWalletAddressMap[this.networkId];
      const entryPointAddress = this.system_info_config.entryPointAddressMap[this.networkId];
      const handlerAddress = this.system_info_config.handlerAddressMap[this.networkId];

      const forwarderDomainDetails:Array<DomainData> = [];

      await Promise.all(biconomyForwarderAddresses.map(async (element:string) => {
        forwarderDomainDetails[parseInt(element, 10)] = await this.getForwarderDomainDataCustom(
          element,
        );
      }));

      systemInfo.data = {
        biconomyForwarderAddress,
        biconomyForwarderAddresses,
        erc20ForwarderAddress,
        oracleAggregatorAddress,
        transferHandlerAddress,
        daiTokenAddress,
        usdtTokenAddress,
        usdcTokenAddress,
        eip712Sign: config.signatureType.EIP712_SIGNATURE,
        personalSign: config.signatureType.PERSONAL_SIGNATURE,
        defaultMetaTransaction: ContractMetaTransactionType.DEFAULT,
        trustedForwarderMetaTransaction: ContractMetaTransactionType.EIP2771,
        erc20ForwarderMetaTransaction: ContractMetaTransactionType.FORWARD,
        tokenGasPriceV1SupportedNetworks: config.tokenGasPriceV1SupportedNetworks,
        overHeadEIP712Sign: config.overHeadEIP712Sign,
        overHeadPersonalSign: config.overHeadPersonalSign,
        overHeadDaiPermit: config.overHeadDaiPermit,
        overHeadEIP2612Permit: config.overHeadEIP2612Permit,
        domainType,
        forwarderDomainType,
        forwardRequestType,
        daiPermitType,
        eip2612PermitType,
        forwarderDomainData: this.forwarderDomainData,
        forwarderDomainDetails,
        walletFactoryAddress,
        baseWalletAddress,
        entryPointAddress,
        handlerAddress,
      };

      return {
        code: '200',
        data: systemInfo.data,
      };
    } catch (err) {
      console.log(err);
      return {
        code: '500',
      };
    }
  }

  static async getFromCache(key: string) {
    const data = await cache.get(key) || '';
    return data;
  }

  async getForwarderDomainDataCustom(forwarder:string) {
    const domainDataCustom:DomainData = this.forwarderDomainData;
    const forwarderDetailsFromCache = await cache.get(
      getForwarderDefaultDomainDataKey(forwarder, this.networkId.toString()),
    );
    if (forwarderDetailsFromCache) {
      const forwarderInfo = JSON.parse(forwarderDetailsFromCache);
      domainDataCustom.name = forwarderInfo.name;
      domainDataCustom.version = forwarderInfo.version;
      domainDataCustom.verifyingContract = forwarder;
      domainDataCustom.salt = ethers.utils.hexZeroPad(
        (
          ethers.BigNumber.from(this.networkId)).toHexString(),
        32,
      );
    }
    return domainDataCustom;
  }
}
