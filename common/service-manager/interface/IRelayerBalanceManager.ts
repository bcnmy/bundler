/* eslint-disable @typescript-eslint/indent */
import {
    FeeManager,
    IEVMAccount,
    ITransactionService,
} from 'fee-management';
import { TransactionReceipt } from '@ethersproject/providers';
import { EVMRawTransactionType, TransactionType } from '../../types';
import { FeeManagerParams } from '../types';

export interface IRelayerBalanceManager {
    feeManagerSCW: FeeManager | undefined;

    feeManagerCCMP: FeeManager | undefined;

    transactionServiceMap: Record<number,
        ITransactionService<IEVMAccount, EVMRawTransactionType>> | undefined;

    init(feeManagerParams: FeeManagerParams): void;

    onTransaction(transactionReceipt: TransactionReceipt,
        transactionType: TransactionType, chainId: number): void;
    setTransactionServiceMap(transactionServiceMap: Record<number,
        ITransactionService<IEVMAccount, EVMRawTransactionType>>): void;
}
