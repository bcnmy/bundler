import { MetaInfoType } from 'src/common/types';
import { LimitType } from '../../../dao-utils/interface/dao-utils';

export type NativeAPIParamsType = {
  apiKey: string,
  apiId: string,
  from?: string,
  to: string,
  transactionParams: Array<any>,
  origin?: string,
  userAddress?: string,
  gasLimit?: number | string,
  metaInfo: MetaInfoType,
  signatureType: string
};

export type ValidateResponseType = {
  networkId: string,
  conditional: {
    passed: boolean,
    msg: string,
  },
  apiData: {
    contractId: string,
    method: string,
    methodType: string,
  },
  dappId: string,
  smartContractData: {
    address: string,
    metaTransactionType: string,
    abi: JSON,
  },
  limitsData: {
    maxUsage: {
      dappLimit: number | undefined,
      userLimit: number | undefined,
      apiLimit: number | undefined,
    }
    currentUsage: {
      dappLimit: number | undefined,
      userLimit: number | undefined,
      apiLimit: number | undefined,
    }
  }
};

export function isError<T>(
  response: T | ErrorType,
): response is ErrorType {
  return (response as ErrorType).error !== undefined;
}

export type ErrorType = {
  error: string,
  code: number,
};

export type PreFlightCheckResponseType = {
  errorMessage: string,
  readyToPay: boolean,
};

export type LimitsConsumptionDataType = {
  areLimitsConsumed: boolean,
  maxUsage?: number,
  currentUsage?: number,
};

export type ApiKeyAuthResponseType = {
  networkId: string,
  createdBy: string,
  dappId: string,
  enableWhiteList: boolean,
  active: boolean,
  allowedDomains: string[],
  dappLimit: LimitType,
  userLimit: LimitType,
  apiLimit: LimitType,
  dappLimitStatus: number,
  userLimitStatus: number,
  apiLimitStatus: number,
};

export type CheckIfActiveDappType = {
  isDappActive: boolean
};

export type SmartContractWalletAuth = {
  isSmartContractWalletAuthenticated: boolean
};

export type CheckLimitsResponseType = {
  areLimitsConsumed: boolean,
  maxUsage?: {
    dappLimit: number,
    userLimit: number,
    apiLimit: number,
  },
  currentUsage?: {
    dappLimit: number,
    userLimit: number,
    apiLimit: number,
  }
};

export type CheckDomainsResponseType = {
  domainAllowed: boolean
};

export enum ContractMetaTransactionType {
  DEFAULT = 'CUSTOM',
  EIP2771 = 'TRUSTED_FORWARDER',
  FORWARD = 'ERC20_FORWARDER',
}

export type GetLimitsUsageResponseType = {
  areLimitsConsumed: boolean,
  maxUsage?: number,
  currentUsage?: number
};

export type MetaInfoAuthResponseType = {
  success: boolean
};
