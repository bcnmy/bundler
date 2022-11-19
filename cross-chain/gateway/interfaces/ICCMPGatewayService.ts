import type { BigNumber } from 'ethers';
import type { TransactionReceipt } from '@ethersproject/abstract-provider';
import type { CrossChainTransactionMessageType, CCMPMessage } from '../../../common/types';

export interface ICCMPGatewayService {
  getGasPaidByMessageHash(
    messageHash: string,
    tokenAddresses: string[]
  ): Promise<Map<string, BigNumber>>;

  estimateReceiveMessageGas(
    message: CCMPMessage,
    verificationData: string | Uint8Array
  ): Promise<{ estimate?: BigNumber; error?: string }>;

  createReceiveMessageTransaction(
    message: CCMPMessage,
    verificationData: string | Uint8Array,
    sourceTxHash: string,
  ): Promise<CrossChainTransactionMessageType>;

  getMessageFromSourceTransactionReceipt(
    chainId: number,
    receipt: TransactionReceipt
  ): Promise<CCMPMessage>;

  getMessageFromDestinationTransactionReceipt(
    chainId: number,
    receipt: TransactionReceipt
  ): Promise<CCMPMessage>;
}
