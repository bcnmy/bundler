import {
  PublicClient, Transaction, TransactionReceipt,
} from 'viem';
import { Type0TransactionGasPriceType, Type2TransactionGasPriceType } from '../types';
import { RpcMethod } from '../../types';

export interface INetworkService<AccountType, RawTransactionType> {
  chainId: number;
  rpcUrl: string;
  provider: PublicClient;

  useProvider(tag: RpcMethod, params?: any): Promise<any>
  sendRpcCall(method: string, params: Array<any>): Promise<any>
  getBaseFeePerGas(): Promise<number>
  getLegacyGasPrice(): Promise<Type0TransactionGasPriceType>;
  getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType>;
  getBalance(address: string): Promise<BigInt>;
  getNonce(address: string, pendingNonce?: boolean): Promise<number>
  estimateGas(
    params: any,
  ): Promise<any>
  sendTransaction(
    rawTransactionData: RawTransactionType,
    account: AccountType,
  ): Promise<Transaction>;
  getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;
  waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt>
  getLatesBlockNumber(): Promise<bigint>
  getTransaction(transactionHash: string): Promise<Transaction>
  runAlchemySimulation(params: any): Promise<any>
  ethCall(params: any): Promise<any>
}
