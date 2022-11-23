/* eslint-disable @typescript-eslint/indent */
import { IEVMAccount } from '@biconomy/fee-management/dist/relayer-node-interfaces/IEVMAccount';
import { ITransactionService } from '@biconomy/fee-management/dist/relayer-node-interfaces/ITransactionService';
import { TransactionReceipt } from '@ethersproject/providers';
import { EVMRawTransactionType, TransactionType } from '../../types';

export interface IRelayerBalanceManager {
    onTransaction(transactionReceipt: TransactionReceipt,
        transactionType: TransactionType, chainId: number): void;
    setTransactionServiceMap(transactionServiceMap: Record<number,
        ITransactionService<IEVMAccount, EVMRawTransactionType>>): void;
}
