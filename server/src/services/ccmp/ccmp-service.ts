import { ethers } from 'ethers';
import { config } from '../../../../config';
import { IndexerService } from '../../../../common/indexer/IndexerService';
import {
  CCMPMessage,
  GasFeePaymentArgsStruct,
  TransactionType,
  isError,
  CCMPTransactionMessageType,
  CCMPRouterName,
} from '../../../../common/types';
import { logger } from '../../../../common/log-config';
import type { routeTransactionToRelayerMap as globalRouteTransactionToRelayerMap } from '../../../../common/service-manager';
import { ICCMPRouterService } from './types';

const log = logger(module);

class CCMPService {
  private readonly eventName = 'CCMPMessageRouted';

  private readonly indexerService: IndexerService;

  private readonly webHookEndpoint: string;

  constructor(
    private readonly chainId: number,
    private readonly routerServiceMap: { [key in CCMPRouterName]?: ICCMPRouterService },
    private readonly routeTransactionToRelayerMap: typeof globalRouteTransactionToRelayerMap
  ) {
    this.indexerService = new IndexerService(config.indexer.baseUrl);
    this.webHookEndpoint = config.ccmp.webhookEndpoint;
  }

  async init() {
    const event = config.ccmp.events[this.eventName]?.[this.chainId];
    if (!event) {
      throw new Error(`Event ${this.eventName} not found for chain ${this.chainId}`);
    }

    const blockConfirmations = config.ccmp.indexerWebhookBlockConfirmation[this.chainId];
    if (!blockConfirmations) {
      throw new Error(`Indexer Block confirmations not found for chain ${this.chainId}`);
    }

    try {
      await this.indexerService.registerWebhook(
        this.webHookEndpoint,
        config.indexer.auth,
        this.chainId,
        [
          {
            scAddress: config.ccmp.contracts[this.chainId].CCMPGateway,
            abi: JSON.stringify(config.ccmp.abi.CCMPGateway),
            events: [
              {
                name: config.ccmp.events.CCMPMessageRouted[this.chainId].name,
                topicid: config.ccmp.events.CCMPMessageRouted[this.chainId].topicId,
                blockConfirmations: config.ccmp.indexerWebhookBlockConfirmation[this.chainId],
                processTransferLogs: true,
              },
            ],
          },
        ]
      );
    } catch (e) {
      log.error(`Failed to register webhook for chain ${this.chainId}`, e);
      throw new Error(`Failed to register webhook for chain ${this.chainId}`);
    }
  }

  private static keysToLowerCase(obj: any): any {
    return Object.keys(obj).reduce((acc: any, key) => {
      const newKey = key.charAt(0).toLowerCase() + key.slice(1);
      acc[newKey] = obj[key];
      return acc;
    }, {});
  }

  private static parseIndexerEvent = (event: Record<string, any>): CCMPMessage =>
    ({
      ...event,
      gasFeePaymentArgs: CCMPService.keysToLowerCase(
        event.gasFeePaymentArgs
      ) as GasFeePaymentArgsStruct,
      payload: event.payload
        .map((payload: any) => CCMPService.keysToLowerCase(payload))
        .map((payload: any) => ({
          to: payload.to,
          _calldata: payload.calldata,
        })),
    } as CCMPMessage);

  private static createTransaction = (
    message: CCMPMessage,
    verificationData: string | Uint8Array
  ): CCMPTransactionMessageType => {
    const CCMPGatewayInterface = new ethers.utils.Interface(config.ccmp.abi.CCMPGateway);

    const data = CCMPGatewayInterface.encodeFunctionData('receiveMessage', [
      message,
      verificationData,
      false,
    ]);

    return {
      type: TransactionType.CROSS_CHAIN,
      to: message.destinationGateway,
      data,
      gasLimit: '0xF4240',
      chainId: parseInt(message.destinationChainId.toString(), 10),
      value: '0x0',
      transactionId: message.hash,
    };
  };

  async processTransaction(tx: {
    txHash: string;
    gasUsage: number;
    chainId: number;
    from: string;
    scAddress: string;
    eventName: string;
    eventData: any;
  }) {
    // TODO: Validation (deduplication etc)?

    // TODO: Add to DB
    const message = CCMPService.parseIndexerEvent(tx.eventData);

    const routerService = this.routerServiceMap[message.routerAdaptor as CCMPRouterName];

    if (!routerService) {
      throw new Error(
        `CCMP Router service not found for chain ${message.sourceChainId} and router ${message.routerAdaptor}`
      );
    }

    // TODO: Update DB
    // Pay Gas Fee to the underlying protocol if required and perform other steps as needed
    log.info(
      `CCMP: Pre-Verification for source tx hash ${tx.txHash} message hash: ${message.hash}`
    );
    try {
      await routerService.handlePreVerification(tx.txHash, message);
    } catch (e) {
      log.error(`CCMP: Pre-Verification failed for tx ${tx.txHash} message hash: ${message.hash}`);
      throw e;
    }

    // TODO: Update DB
    // Wait for the Actual Verification to be done, and get any data required to
    // prove the authenticity of the message
    let verificationData: string | Uint8Array;
    try {
      verificationData = await routerService.getVerificationData(tx.txHash, message);
      log.info(`Verification data for message ${message.hash}: ${verificationData}`);
    } catch (e) {
      log.error(`Error getting verification data for message ${message.hash}`, e);
      throw e;
    }

    // TODO: Update DB
    // Create and send the transaction to be sent to the destination chain
    const toChain = Number(message.destinationChainId.toString());
    const transaction = CCMPService.createTransaction(message, verificationData);
    const response = await this.routeTransactionToRelayerMap[toChain][
      TransactionType.CROSS_CHAIN
    ].sendTransactionToRelayer(transaction);
    if (isError(response)) {
      throw new Error(`Error while sending transaction to CCMP relayer: ${response.error}`);
    } else {
      log.info(`Transaction sent to CCMP relayer: ${response}`);
    }

    // TODO: Update DB
  }
}

export { CCMPService };
