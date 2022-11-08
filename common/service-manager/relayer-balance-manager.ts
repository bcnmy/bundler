/* eslint-disable @typescript-eslint/indent */
import { FeeManager } from '@biconomy/fee-management';
import { IEVMAccount } from '@biconomy/fee-management/dist/relayer-node-interfaces/IEVMAccount';
import { ITransactionService } from '@biconomy/fee-management/dist/relayer-node-interfaces/ITransactionService';
import { AppConfig } from '@biconomy/fee-management/dist/types';
import { ethers } from 'ethers';
import { ICacheService } from '../cache';
import { ITransactionDAO } from '../db';
import { ITokenPrice } from '../token-price/interface/ITokenPrice';
import { EVMRawTransactionType, TransactionType } from '../types';

type FeeManagerParams = {
    masterFundingAccountSCW: IEVMAccount;
    relayerAddressesSCW: String[];
    masterFundingAccountCCMP: IEVMAccount;
    relayerAddressesCCMP: String[];
    appConfig: AppConfig;
    dbService: ITransactionDAO;
    tokenPriceService: ITokenPrice;
    cacheService: ICacheService;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
};

export class RelayerBalanceManager {
    feeManagerSCW: any;

    feeManagerCCMP: any;

    constructor(feeManagerParams: FeeManagerParams) {
        this.feeManagerSCW = new FeeManager({
            masterFundingAccount: feeManagerParams.masterFundingAccountSCW,
            relayerAddresses: feeManagerParams.relayerAddressesSCW,
            appConfig: feeManagerParams.appConfig,
            dbService: feeManagerParams.dbService,
            tokenPriceService: feeManagerParams.tokenPriceService,
            cacheService: feeManagerParams.cacheService,
            transactionServiceMap: feeManagerParams.transactionServiceMap,
        });

        this.feeManagerCCMP = new FeeManager({
            masterFundingAccount:
                feeManagerParams.masterFundingAccountCCMP,
            relayerAddresses: feeManagerParams.relayerAddressesCCMP,
            appConfig: feeManagerParams.appConfig,
            dbService: feeManagerParams.dbService,
            tokenPriceService: feeManagerParams.tokenPriceService,
            cacheService: feeManagerParams.cacheService,
            transactionServiceMap: feeManagerParams.transactionServiceMap,
        });

        this.feeManagerSCW.init();

        this.feeManagerCCMP.init();
    }

    onTransaction(
        transactionReceipt: ethers.providers.TransactionReceipt,
        transactionType: TransactionType,
        chainId: number,
    ) {
        if (transactionType === TransactionType.CROSS_CHAIN) {
            this.feeManagerCCMP.onTransaction(transactionReceipt, chainId);
        } else if (transactionType === TransactionType.SCW) {
            this.feeManagerSCW.onTransaction(transactionReceipt, chainId);
        }
    }
}
