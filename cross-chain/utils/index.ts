import { ethers } from 'ethers';
import { TransactionType } from '../../common/types';
import { config } from '../../config';
import type {
  GasFeePaymentArgsStruct,
  CrossChainTransactionMessageType,
  CCMPMessage,
} from '../../common/types';
import { logger } from '../../common/log-config';

const log = logger(module);

export const keysToLowerCase = (obj: any): any => Object.keys(obj).reduce((acc: any, key) => {
  const newKey = key.charAt(0).toLowerCase() + key.slice(1);
  acc[newKey] = obj[key];
  return acc;
}, {});

export const parseIndexerEvent = (event: Record<string, any>): CCMPMessage => ({
  ...event,
  gasFeePaymentArgs: keysToLowerCase(event.gasFeePaymentArgs) as GasFeePaymentArgsStruct,
  payload: event.payload
    .map((payload: any) => keysToLowerCase(payload))
    .map((payload: any) => ({
      to: payload.to,
      _calldata: payload.calldata,
    })),
} as CCMPMessage);

export const createCCMPGatewayTransaction = (
  message: CCMPMessage,
  verificationData: string | Uint8Array,
  executionIndex: number,
  sourceTxHash: string,
): CrossChainTransactionMessageType => {
  log.info(
    `Creating CCMP Gateway Transaction for message ${message.hash} with verification data ${verificationData} and execution index ${executionIndex}`,
  );
  const CCMPGatewayInterface = new ethers.utils.Interface(config.ccmp.abi.CCMPGateway);
  const data = CCMPGatewayInterface.encodeFunctionData('receiveMessage', [
    message,
    verificationData,
    false,
  ]);

  return {
    transactionId: message.hash,
    type: TransactionType.CROSS_CHAIN,
    to: message.destinationGateway,
    data,
    // TODO: Generalize
    gasLimit: '0xF4240',
    chainId: parseInt(message.destinationChainId.toString(), 10),
    value: '0x0',
    executionIndex,
    message,
    sourceTxHash,
  };
};
