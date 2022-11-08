import { ethers } from 'ethers';
import type { Contract, ContractInterface } from 'ethers';
import type { Interface } from 'ethers/lib/utils';
import { config } from '../../config';
import { TransactionType } from '../../common/types';
import type { CrossChainTransactionMessageType, CCMPMessage } from '../../common/types';
import { logger } from '../../common/log-config';
import type { EVMNetworkService } from '../../common/network';

const log = logger(module);

export class CCMPGatewayService {
  private ccmpGateway: Contract;

  private interface: Interface;

  constructor(
    gatewayAddress: string,
    public readonly chainId: number,
    abi: ContractInterface,
    private readonly networkService: EVMNetworkService,
  ) {
    this.ccmpGateway = this.networkService.getContract(JSON.stringify(abi), gatewayAddress);
    this.interface = this.ccmpGateway.interface;
  }

  async getGasPaidByMessageHash(
    messageHash: string,
    tokenAddresses: string[],
  ): Promise<Map<string, ethers.BigNumber>> {
    log.info(`Getting gas paid for message ${messageHash} and tokens ${tokenAddresses}...`);
    const data: ethers.BigNumber[] = await this.ccmpGateway.getGasFeePaymentDetails(
      messageHash,
      tokenAddresses,
    );
    log.info(`Gas paid for message ${messageHash}: ${JSON.stringify(data)}`);
    return new Map<string, ethers.BigNumber>(
      tokenAddresses.map((tokenAddress, i) => [tokenAddress, data[i]]),
    );
  }

  async estimateReceiveMessageGas(
    message: CCMPMessage,
    verificationData: string | Uint8Array,
  ): Promise<{ estimate?: ethers.BigNumber; error?: string }> {
    log.info(
      `Estimating gas for CCMP Gateway receiveMessage transaction for message ${message.hash}...`,
    );
    try {
      const estimate = await this.ccmpGateway.estimateGas.receiveMessage(
        message,
        verificationData,
        false,
      );
      log.info(`Estimated gas for CCMP Gateway receiveMessage transaction: ${estimate} for message ${message.hash}`);
      return {
        estimate,
      };
    } catch (e) {
      log.error(`Error estimating gas for receiveMessage: ${JSON.stringify(e)}`);
      const errorData = (e as any).error?.data
        || (e as any).error?.error?.data
        || (e as any).error?.error?.error?.data;
      if (errorData) {
        const error = this.interface.parseError(errorData);
        log.error(`Decoded Error Data: ${JSON.stringify(error)}`);
        return { error: JSON.stringify(error) };
      }
      return { error: JSON.stringify(e) };
    }
  }

  buildReceiveMessageCalldata(message: CCMPMessage, verificationData: string | Uint8Array): string {
    return this.interface.encodeFunctionData('receiveMessage', [message, verificationData, false]);
  }

  createReceiveMessageTransaction(
    message: CCMPMessage,
    verificationData: string | Uint8Array,
    sourceTxHash: string,
  ): CrossChainTransactionMessageType {
    log.info(
      `Creating CCMP Gateway Transaction for message ${message.hash} with verification data ${verificationData}`,
    );

    return {
      transactionId: message.hash,
      type: TransactionType.CROSS_CHAIN,
      to: message.destinationGateway,
      data: this.buildReceiveMessageCalldata(message, verificationData),
      // TODO: Generalize
      gasLimit: '0xF4240',
      chainId: parseInt(message.destinationChainId.toString(), 10),
      value: '0x0',
      message,
      sourceTxHash,
    };
  }

  async getMessageFromDestinationTranasactionReceipt(
    chainId: number,
    receipt: ethers.providers.TransactionReceipt,
  ): Promise<CCMPMessage> {
    log.info(
      `Getting CCMP Message Payload on chain ${chainId} transaction ${receipt.transactionHash}`,
    );
    const messageLog = receipt.logs.find(
      (_log) => _log.topics[0] === config.ccmp.events.CCMPMessageExecuted[chainId].topicId,
    );
    if (!messageLog) {
      throw new Error(
        `No CCMP message routed log found for transaction ${receipt.transactionHash}`,
      );
    }
    const data = this.interface.parseLog(messageLog);
    const {
      sender,
      sourceGateway,
      sourceAdaptor,
      sourceChainId,
      destinationGateway,
      destinationChainId,
      nonce,
      routerAdaptor,
      payload,
      gasFeePaymentArgs,
      hash,
    } = data.args;
    return {
      sender,
      sourceGateway,
      sourceChainId,
      sourceAdaptor,
      destinationChainId,
      destinationGateway,
      nonce,
      routerAdaptor,
      payload,
      gasFeePaymentArgs,
      hash,
    };
  }
}
