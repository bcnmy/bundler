import {
  IApi,
  IBlockchainTransaction,
  IDapp,
  IGnosisWhitelistedTargetContract,
  ISmartContract,
  IUser,
  IDappConfig,
} from '@bcnmy/db-sdk/dist/schemas';
import { Types } from 'mongoose';

export type LimitType = {
  durationUnit: string,
  type: number,
  durationValue: number,
  value: number,
  limitDurationInMs: number,
  limitStartTime: number,
};

export type DappType = IDapp & { _id: Types.ObjectId };

export type SmartContractType = ISmartContract & { _id: Types.ObjectId };

export type MetaApiType = IApi & { _id: Types.ObjectId };

export type UserType = IUser & { _id: Types.ObjectId };

export type CheckLimitsMatchParamsTransactionAggregateType = {
  dappId: string
} | { apiId: string } | { signerAddress: string };

export type TransactionFeeForCheckLimitsAggregateType = {
  _id: string,
  totalTransactionFee: number,
};

export type TransactionCountForCheckLimitsAggregateType = {
  _id: string,
  transactionCount: number
};
export interface IDaoUtils {
  findOneApiByApiId(apiId: string): Promise<IApi>
  findOneDappByApiKey(apiKey: string): Promise<DappType>
  findOneDappByApiId(apiId: string): Promise<IDapp>
  findOneSmartContractByContractId(contractId: Types.ObjectId): Promise<ISmartContract>
  updateDappLimitStartTime(
    dappId: string,
    limitStartTime: number,
  ): Promise<IDapp>
  findOneDappByDappId(dappId: string): Promise<IDapp>
  getTransactionFeeForCheckLimitsAggregate(
    _matchFieldParams: Array<CheckLimitsMatchParamsTransactionAggregateType>,
    startTime: number,
    endTime: number,
    networkId: number,): Promise<Array<TransactionFeeForCheckLimitsAggregateType>>
  getTransactionCountForCheckLimitsAggregate(
    _matchFieldParams: Array<CheckLimitsMatchParamsTransactionAggregateType>,
    startTime: number,
    endTime: number,
    networkId: number,): Promise<Array<TransactionCountForCheckLimitsAggregateType>>
  getSmartContractsByDappId(dappId: string): Promise<Array<SmartContractType>>
  getMetaApisByDappId(dappId: string): Promise<Array<MetaApiType>>
  findUserByAuthToken(authToken: string): Promise<UserType>
  saveWhitelistTargetContractsResult(
    dappId: Types.ObjectId,
    contractAddresses: Array<string>
  ): Promise<Array<IGnosisWhitelistedTargetContract>>
  findOneWhitelistedTargeByDappIdAndContractAddress(
    dappId: string,
    to: string
  ): Promise<IGnosisWhitelistedTargetContract>
  findOneConditionalLimitByApiId(apiId: string): Promise<MetaApiType>
  findTransactionStatusByTransactionId(
    networkId: number, transactionId: string): Promise<IBlockchainTransaction>
  findAllowedDomainsByDappId(dappId: string): Promise<IDappConfig>
}
