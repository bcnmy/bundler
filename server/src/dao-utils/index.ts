/* eslint-disable no-await-in-loop */
import {
  IApi, IDapp, IDappConfig, IGnosisWhitelistedTargetContract, ISmartContract,
} from '@bcnmy/db-sdk/dist/schemas';
import { Types } from 'mongoose';
import { logger } from '../../log-config';
import { UserDappDataType } from '../common/types';
import { Mongo } from '../db/mongo';
import { parseError } from '../utils/util';
import {
  CheckLimitsMatchParamsTransactionAggregateType,
  DappType,
  IDaoUtils,
  MetaApiType,
  SmartContractType,
  TransactionCountForCheckLimitsAggregateType,
  TransactionFeeForCheckLimitsAggregateType,
  UserType,
} from './interface/dao-utils';

const log = logger(module);

export class DaoUtils implements IDaoUtils {
  db;

  EModels;

  constructor(dbInstance: Mongo) {
    this.db = dbInstance.db;
    this.EModels = dbInstance.db.EModels;
  }

  async findOneApiByApiId(apiId: string): Promise<IApi> {
    const data = await this.db.get(this.EModels.Api).findOne({ apiId });
    return data;
  }

  async findOneDappByApiKey(apiKey: string): Promise<DappType> {
    const data = await this.db.get(this.EModels.Dapp).findOne({ apiKey });
    return data;
  }

  async findOneSmartContractByContractId(contractId: Types.ObjectId): Promise<ISmartContract> {
    const data = await this.db.get(this.EModels.SmartContract).findOne({ _id: contractId });
    return data;
  }

  async findOneDappByDappId(dappId: string): Promise<IDapp> {
    const data = await this.db.get(this.EModels.Dapp).findById(dappId);
    return data;
  }

  async updateDappLimitStartTime(
    dappId: string,
    limitStartTime: number,
  ): Promise<IDapp> {
    const data = await this.db.get(this.EModels.Dapp).findOneAndUpdate(
      { _id: dappId },
      { $set: { limitStartTime } },
      { new: true },
    );
    return data;
  }

  async getTransactionFeeForCheckLimitsAggregate(
    _matchFieldParams: Array<CheckLimitsMatchParamsTransactionAggregateType>,
    startTime: number,
    endTime: number,
    networkId: number,
  ): Promise<Array<TransactionFeeForCheckLimitsAggregateType>> {
    const transactionMatchFieldOne = {
      $match: {
        $and: _matchFieldParams,
      },
    };
    const transactionMatchFieldTwo = {
      $match: {
        $and: [{ creationTime: { $gte: startTime, $lt: endTime } }],
      },
    };

    const transactionGroupField = {
      $group: {
        _id: 'null',
        totalTransactionFee: { $sum: '$transactionFee' },
      },
    };

    const transactionQueryDataArray = [
      transactionMatchFieldOne,
      transactionMatchFieldTwo,
      transactionGroupField,
    ];
    const data = await this.db.getBlockchainTransaction(networkId)
      .aggregate(transactionQueryDataArray);
    return data;
  }

  async getTransactionCountForCheckLimitsAggregate(
    _matchFieldParams: Array<CheckLimitsMatchParamsTransactionAggregateType>,
    startTime: number,
    endTime: number,
    networkId: number,
  ): Promise<Array<TransactionCountForCheckLimitsAggregateType>> {
    const transactionMatchFieldOne = {
      $match: {
        $and: _matchFieldParams,
      },
    };
    const transactionMatchFieldTwo = {
      $match: {
        $and: [{ creationTime: { $gte: startTime, $lt: endTime } }],
      },
    };
    const transactionGroupField = {
      $group: {
        _id: 'null',
        transactionCount: { $sum: 1 },
      },
    };

    const transactionQueryDataArray = [
      transactionMatchFieldOne,
      transactionMatchFieldTwo,
      transactionGroupField,
    ];
    const data = await this.db.getBlockchainTransaction(networkId).aggregate(
      transactionQueryDataArray,
    );
    return data;
  }

  async findOneDappByApiId(
    apiId: string,
  ): Promise<IDapp> {
    const data = await this.db.get(this.EModels.Api).findOne({ apiId });
    return data;
  }

  async saveTransactionData(networkId: number, transactionData: any) {
    try {
      await this.db.getBlockchainTransaction(networkId).insertMany([transactionData]);
    } catch (error) {
      log.error(`failed to save in db ${parseError(error)}`);
    }
  }

  async findOneConditionalLimitByApiId(apiId: string) {
    const data = await this.db.get(this.EModels.Api).findOne({ apiId });
    return data;
  }

  async getSmartContractsByDappId(dappId: string): Promise<Array<SmartContractType>> {
    const data = await this.db.get(this.EModels.SmartContract).find(
      {
        dappId: new Types.ObjectId(dappId),
      },
    );
    return data;
  }

  async getMetaApisByDappId(_dappId: string): Promise<Array<MetaApiType>> {
    const dappId = new Types.ObjectId(_dappId);
    const data = await this.db.get(this.EModels.Api).find({ dappId });
    return data;
  }

  async findUserByAuthToken(authToken: string): Promise<UserType> {
    const result = await this.db.get(this.EModels.User).findOne({ authToken });
    return result;
  }

  async saveWhitelistTargetContractsResult(
    dappId: Types.ObjectId,
    contractAddresses: Array<string>,
  ): Promise<Array<IGnosisWhitelistedTargetContract>> {
    const GnosisWhitelistTargetContract = await this.db.get(
      this.EModels.GnosisWhitelistedTargetContract,
    );
    const result = [];
    const dapp = await this.db.get(this.EModels.Dapp).findOne({ _id: dappId });
    for (
      let contractAddressIndex = 0;
      contractAddressIndex < contractAddresses.length;
      contractAddressIndex += 1
    ) {
      const gnosisWhitelistTargetContractData = {
        dappId,
        contractAddress: contractAddresses[contractAddressIndex],
        status: true,
        createdOn: Date.now(),
        createdBy: dapp.createdBy,
        updatedOn: Date.now(),
        updatedBy: dapp.createdBy,
      };
      const gnosisWhitelistTargetContract = new GnosisWhitelistTargetContract(
        gnosisWhitelistTargetContractData,
      );
      const savedData = await gnosisWhitelistTargetContract.save();
      result.push(savedData);
    }
    return result;
  }

  async findOneWhitelistedTargeByDappIdAndContractAddress(
    dappId: string,
    to: string,
  ): Promise<IGnosisWhitelistedTargetContract> {
    const result = await this.db.get(
      this.EModels.GnosisWhitelistedTargetContract,
    ).findOne({ dappId: new Types.ObjectId(dappId), contractAddress: to });
    return result;
  }

  async getUserDappDataByDappId(_dappId: string): Promise<UserDappDataType> {
    const dappId = new Types.ObjectId(_dappId);
    const dappData = await this.db.get(this.EModels.Dapp).findOne({ _id: dappId });
    const userData = await this.db.get(this.EModels.User).findOne({ _id: dappData.createdBy });

    return {
      dappName: dappData.dappName,
      dappEmail: userData.email,
      adminEmail: userData.adminEmail,
    };
  }

  async findTransactionStatusByTransactionId(
    networkId: number,
    transactionId: string,
  ): Promise<any> {
    const data = await this.db.getBlockchainTransaction(networkId).findOne({
      transactionId,
    }).lean();
    return data;
  }

  async findAllowedDomainsByDappId(dappId: string): Promise<IDappConfig> {
    const result = await this.db.get(this.EModels.DappConfig).findOne({
      dappId: new Types.ObjectId(dappId),
    });
    return result;
  }
}
