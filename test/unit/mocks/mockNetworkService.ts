/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/space-before-blocks */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/indent */
import { JsonRpcProvider, TransactionResponse, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, Contract } from 'ethers';
import {
    INetworkService,
    RpcMethod,
    Type0TransactionGasPriceType,
    Type2TransactionGasPriceType,
} from '../../../common/network';
import { EVMRawTransactionType } from '../../../common/types';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { MockJsonProvider } from './mockJsonProvider';

export class MockNetworkService implements INetworkService<IEVMAccount, EVMRawTransactionType>{
    chainId: number;

    rpcUrl: string;

    fallbackRpcUrls: string[];

    ethersProvider: JsonRpcProvider = new MockJsonProvider();

    constructor(tempParams: any) {
        this.chainId = tempParams.chaindId;
        this.rpcUrl = tempParams.rpcUrl;
        this.fallbackRpcUrls = tempParams.fallbackRpcUrls;
    }

    getActiveRpcUrl(): string {
        throw new Error('Method not implemented.');
    }

    setActiveRpcUrl(rpcUrl: string): void {
        throw new Error('Method not implemented.');
    }

    getFallbackRpcUrls(): string[] {
        throw new Error('Method not implemented.');
    }

    setFallbackRpcUrls(rpcUrls: string[]): void {
        throw new Error('Method not implemented.');
    }

    useProvider(tag: RpcMethod, params?: any): Promise<any> {
        throw new Error('Method not implemented.');
    }

    sendRpcCall(method: string, params: object[]): Promise<any> {
        throw new Error('Method not implemented.');
    }

    getGasPrice(): Promise<Type0TransactionGasPriceType> {
        const gasPrice: Type0TransactionGasPriceType = {
            gasPrice: '1',
        };
        return Promise.resolve(gasPrice);
    }

    getEIP1559GasPrice(): Promise<Type2TransactionGasPriceType> {
        throw new Error('Method not implemented.');
    }

    getBalance(address: string): Promise<BigNumber> {
        return Promise.resolve(BigNumber.from(1));
    }

    getContract(abi: string, contractAddress: string): Contract {
        throw new Error('Method not implemented.');
    }

    getNonce(address: string, pendingNonce?: boolean | undefined): Promise<number> {
        throw new Error('Method not implemented.');
    }

    executeReadMethod(
        abi: string,
        contractAddress: string,
        methodName: string,
        params: object,
    ): Promise<object> {
        return Promise.resolve(new Object(BigNumber.from(1)))
    }

    estimateGas(
        contract: Contract,
        methodName: string,
        params: object,
        from: string,
    ): Promise<BigNumber> {
        return Promise.resolve(BigNumber.from('1'));
    }

    sendTransaction(
        rawTransactionData: EVMRawTransactionType,
        account: IEVMAccount,
    ): Promise<TransactionResponse> {
        throw new Error('Method not implemented.');
    }

    getContractEventEmitter(contractAddress: string, contractAbi: string, topic: string, contractEventName: string): Promise<import('events')> {
        throw new Error('Method not implemented.');
    }

    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
        throw new Error('Method not implemented.');
    }

    waitForTransaction(transactionHash: string): Promise<TransactionReceipt> {
        throw new Error('Method not implemented.');
    }

    async checkAllowance(
        tokenAddress: string,
        ownerAddress: string,
        spenderAddress: string,
        value: BigNumber,
    ): Promise<boolean> {
        return true;
    }

    async getTokenBalance(userAddress: string, tokenAddress: string): Promise<BigNumber> {
        return BigNumber.from('1');
    }

    async getDecimal(tokenAddress: string): Promise<number> {
        return 1;
    }
}
