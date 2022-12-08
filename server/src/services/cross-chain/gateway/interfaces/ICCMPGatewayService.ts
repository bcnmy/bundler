import type { BigNumber } from 'ethers';
import type { TransactionReceipt } from '@ethersproject/abstract-provider';
import type { CrossChainTransactionMessageType, CCMPMessageType } from '../../../../../../common/types';

export interface ICCMPGatewayService {
  getGasPaidByMessageHash(
    messageHash: string,
    tokenAddresses: string[]
  ): Promise<Map<string, BigNumber>>;

  estimateReceiveMessageGas(
    message: CCMPMessageType,
    verificationData: string | Uint8Array
  ): Promise<{ estimate?: BigNumber; error?: string }>;

  createReceiveMessageTransaction(
    message: CCMPMessageType,
    verificationData: string | Uint8Array,
    sourceTxHash: string,
  ): Promise<CrossChainTransactionMessageType>;

  getMessageFromSourceTransactionReceipt(
    chainId: number,
    receipt: TransactionReceipt
  ): Promise<CCMPMessageType>;

  getMessageFromDestinationTransactionReceipt(
    chainId: number,
    receipt: TransactionReceipt
  ): Promise<CCMPMessageType>;

  buildReceiveMessageCalldata(
    message: CCMPMessageType,
    verificationData: string | Uint8Array
  ): string;
}
