/* eslint-disable @typescript-eslint/indent */
import { FeeManager } from '@biconomy/fee-management';
import { IEVMAccount } from '@biconomy/fee-management/dist/relayer-node-interfaces/IEVMAccount';
import { ITransactionService } from '@biconomy/fee-management/dist/relayer-node-interfaces/ITransactionService';
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
