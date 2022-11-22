/* eslint-disable @typescript-eslint/indent */
import { FeeManager } from '@biconomy/fee-management';
import { IEVMAccount } from '@biconomy/fee-management/dist/relayer-node-interfaces/IEVMAccount';
import { ITransactionService } from '@biconomy/fee-management/dist/relayer-node-interfaces/ITransactionService';
import { AppConfig, Mode } from '@biconomy/fee-management/dist/types';
import { ICacheService } from '../cache';
import { ITokenPrice } from '../token-price/interface/ITokenPrice';
import { EVMRawTransactionType, TransactionType } from '../types';
import { logger } from '../log-config';
import { ethers } from 'ethers';

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
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    labelSCW: string | undefined;
    labelCCMP: string | undefined;
};

export class RelayerBalanceManager {
    feeManagerSCW: FeeManager | undefined;

    feeManagerCCMP: FeeManager | undefined;
    constructor(feeManagerParams: FeeManagerParams) {
        try {
            if (feeManagerParams.labelSCW) {
                this.feeManagerSCW = new FeeManager({
                    masterFundingAccount: feeManagerParams.masterFundingAccountSCW,
                    relayerAddresses: feeManagerParams.relayerAddressesSCW,
                    appConfig: feeManagerParams.appConfig,
                    dbUrl: feeManagerParams.dbUrl,
                    tokenPriceService: feeManagerParams.tokenPriceService,
                    cacheService: feeManagerParams.cacheService,
                    transactionServiceMap: feeManagerParams.transactionServiceMap,
                    label: feeManagerParams.labelSCW,
                    mode: Mode.SINGLE_CHAIN,
                });

                this.feeManagerSCW.init();
            }
        } catch (error) {
            log.error(error);
        }

        try {
            if (feeManagerParams.labelCCMP) {
                this.feeManagerCCMP = new FeeManager({
                    masterFundingAccount:
                        feeManagerParams.masterFundingAccountCCMP,
                    relayerAddresses: feeManagerParams.relayerAddressesCCMP,
                    appConfig: feeManagerParams.appConfig,
                    dbUrl: feeManagerParams.dbUrl,
                    tokenPriceService: feeManagerParams.tokenPriceService,
                    cacheService: feeManagerParams.cacheService,
                    transactionServiceMap: feeManagerParams.transactionServiceMap,
                    label: feeManagerParams.labelCCMP,
                    mode: Mode.CROSS_CHAIN,
                });
                this.feeManagerCCMP.init();
            }
        } catch (error) {
            log.error(error);
        }
    }

    onTransaction(
        transactionReceipt: ethers.providers.TransactionReceipt,
        transactionType: TransactionType,
        chainId: number,
    ) {
        try {
            if (this.feeManagerSCW && transactionType === TransactionType.CROSS_CHAIN && this.feeManagerCCMP) {
                this.feeManagerCCMP.onTransactionCCMP(transactionReceipt, chainId);
            } else
                if (this.feeManagerSCW && transactionType === TransactionType.SCW && this.feeManagerSCW) {
                    this.feeManagerSCW.onTransactionSCW(transactionReceipt, chainId);
                    // this.feeManagerSCW.onTransactionSCW("0x5a96936256f745d4ef81ca21540f2e5caa46164cb7bdb907e7e0a0695472afef", chainId);
                }
        } catch (error) {
            log.error(error);
        }
    }
}
