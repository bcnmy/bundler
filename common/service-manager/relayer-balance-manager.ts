/* eslint-disable @typescript-eslint/indent */
import {
    IEVMAccount,
    FeeManager, ITransactionService,
    Mode,
} from 'fee-management';
import { ethers } from 'ethers';
import {
    EVMRawTransactionType,
    TransactionType,
} from 'fee-management/src/types';
import { logger } from '../log-config';
import { IRelayerBalanceManager } from './interface/IRelayerBalanceManager';
import { FeeManagerParams } from './types';

const log = logger(module);
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
