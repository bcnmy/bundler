/* eslint-disable @typescript-eslint/indent */
import { FeeManager } from '@biconomy/fee-management';
import { IEVMAccount } from '@biconomy/fee-management/dist/relayer-node-interfaces/IEVMAccount';
import { ITransactionService } from '@biconomy/fee-management/dist/relayer-node-interfaces/ITransactionService';
import { AppConfig, Mode } from '@biconomy/fee-management/dist/types';
import { ethers } from 'ethers';
import { ICacheService } from '../cache';
import { ITokenPrice } from '../token-price/interface/ITokenPrice';
import { EVMRawTransactionType, TransactionType } from '../types';
import { logger } from '../log-config';
import { IRelayerBalanceManager } from './interface/IRelayerBalanceManager';

const log = logger(module);

type FeeManagerParams = {
    masterFundingAccountSCW: IEVMAccount;
    relayerAddressesSCW: String[];
    masterFundingAccountCCMP: IEVMAccount;
    relayerAddressesCCMP: String[];
    appConfig: AppConfig;
    dbUrl: string;
    tokenPriceService: ITokenPrice;
    cacheService: ICacheService;
    labelSCW: string | undefined;
    labelCCMP: string | undefined;
};

export class RelayerBalanceManager implements IRelayerBalanceManager {
    feeManagerSCW: FeeManager | undefined;

    feeManagerCCMP: FeeManager | undefined;

    transactionServiceMap: Record<number,
        ITransactionService<IEVMAccount, EVMRawTransactionType>> | undefined;

    init(feeManagerParams: FeeManagerParams) {
        try {
            if (feeManagerParams.labelSCW && this.transactionServiceMap) {
                this.feeManagerSCW = new FeeManager({
                    masterFundingAccount: feeManagerParams.masterFundingAccountSCW,
                    relayerAddresses: feeManagerParams.relayerAddressesSCW,
                    appConfig: feeManagerParams.appConfig,
                    dbUrl: feeManagerParams.dbUrl,
                    tokenPriceService: feeManagerParams.tokenPriceService,
                    cacheService: feeManagerParams.cacheService,
                    transactionServiceMap: this.transactionServiceMap,
                    label: feeManagerParams.labelSCW,
                    mode: Mode.SINGLE_CHAIN,
                });

                this.feeManagerSCW.init();
            }
        } catch (error) {
            log.error(error);
        }

        try {
            if (feeManagerParams.labelCCMP && this.transactionServiceMap) {
                this.feeManagerCCMP = new FeeManager({
                    masterFundingAccount:
                        feeManagerParams.masterFundingAccountCCMP,
                    relayerAddresses: feeManagerParams.relayerAddressesCCMP,
                    appConfig: feeManagerParams.appConfig,
                    dbUrl: feeManagerParams.dbUrl,
                    tokenPriceService: feeManagerParams.tokenPriceService,
                    cacheService: feeManagerParams.cacheService,
                    transactionServiceMap: this.transactionServiceMap,
                    label: feeManagerParams.labelCCMP,
                    mode: Mode.CROSS_CHAIN,
                });
                this.feeManagerCCMP.init();
            }
        } catch (error) {
            log.error(error);
        }
    }

    setTransactionServiceMap(transactionServiceMap:
        Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>) {
        this.transactionServiceMap = transactionServiceMap;
    }

    onTransaction(
        transactionReceipt: ethers.providers.TransactionReceipt,
        transactionType: TransactionType,
        chainId: number,
    ) {
        try {
            if (this.feeManagerSCW && transactionType === TransactionType.CROSS_CHAIN
                && this.feeManagerCCMP) {
                this.feeManagerCCMP.onTransactionCCMP(transactionReceipt, chainId);
            } else
                if (this.feeManagerSCW && transactionType === TransactionType.SCW
                    && this.feeManagerSCW) {
                    this.feeManagerSCW.onTransactionSCW(transactionReceipt, chainId);
                }
        } catch (error) {
            log.error(error);
        }
    }
}
