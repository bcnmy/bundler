import { config } from '../config';
import { IndexerService } from '../common/indexer/IndexerService';
import {
  CCMPMessage,
  TransactionType,
  CCMPRouterName,
  CrossChainTransationStatus,
  CrossChainTransactionError,
  isError,
} from '../common/types';
import { logger } from '../common/log-config';
import type { routeTransactionToRelayerMap as globalRouteTransactionToRelayerMap } from '../common/service-manager';
import type { ICCMPRouterService } from './types';
import type { ICrossChainTransactionDAO } from '../common/db';
import type { ICCMPService, IHandler } from './task-manager/types';
import { CCMPTaskManager } from './task-manager';
import { createCCMPGatewayTransaction } from './utils';

const log = logger(module);

export class CCMPService implements ICCMPService {
  private readonly eventName = 'CCMPMessageRouted';

  private readonly indexerService: IndexerService;

  private readonly webHookEndpoint: string;

  constructor(
    private readonly chainId: number,
    private readonly routerServiceMap: { [key in CCMPRouterName]?: ICCMPRouterService },
    private readonly routeTransactionToRelayerMap: typeof globalRouteTransactionToRelayerMap,
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO,
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
        ],
      );
    } catch (e) {
      log.error(`Failed to register webhook for chain ${this.chainId}`, e);
      throw new Error(`Failed to register webhook for chain ${this.chainId}`);
    }
  }

  private handleValidation: IHandler = async (data, ctx) => {
    const { supportedRouters } = config.ccmp;
    const { message } = ctx;
    const { sourceChainId, destinationChainId, routerAdaptor } = message;

    // Check Source Chain
    if (!supportedRouters[sourceChainId.toString()]?.includes(routerAdaptor)) {
      return {
        ...data,
        status: CrossChainTransactionError.UNSUPPORTED_ROUTE,
        context: {
          sourceChainId,
          routerAdaptor,
        },
      };
    }

    // Check Destination Chain
    if (!supportedRouters[destinationChainId.toString()]?.includes(routerAdaptor)) {
      return {
        ...data,
        status: CrossChainTransactionError.UNSUPPORTED_ROUTE,
        context: {
          destinationChainId,
          routerAdaptor,
        },
      };
    }

    // Check Router Service
    const routerService = this.routerServiceMap[message.routerAdaptor as CCMPRouterName];
    if (!routerService) {
      return {
        ...data,
        status: CrossChainTransactionError.UNSUPPORTED_ROUTE,
        context: {
          error: `CCMP Router service not found for chain ${message.sourceChainId} and router ${message.routerAdaptor}`,
        },
      };
    }

    return {
      ...data,
      status: CrossChainTransationStatus.TRANSACTION_VALIDATED,
    };
  };

  private handleRouterPreVerification: IHandler = async (data, ctx) => {
    const { sourceTxHash, message } = ctx;
    const routerService = this.routerServiceMap[message.routerAdaptor as CCMPRouterName]!;

    // Pay Gas Fee to the underlying protocol if required and perform other steps as needed
    log.info(
      `CCMP: Starting Pre-Verification for source tx hash ${sourceTxHash} message hash: ${message.hash}`,
    );
    await routerService.handlePreVerification(sourceTxHash, message);
    log.info(
      `CCMP: Pre-Verification for source tx hash ${sourceTxHash} message hash: ${message.hash} completed`,
    );

    return {
      ...data,
      status: CrossChainTransationStatus.PROTOCOL_FEE_PAID,
    };
  };

  private handleFetchVerificationData: IHandler = async (data, ctx) => {
    const { sourceTxHash, message } = ctx;
    const routerService = this.routerServiceMap[message.routerAdaptor as CCMPRouterName]!;

    // Wait for the Actual Verification to be done, and get any data required to
    // prove the authenticity of the message
    ctx.setVerificationData(await routerService.getVerificationData(sourceTxHash, message));
    log.info(`Verification data for message ${message.hash}: ${ctx.verificationData}`);

    return {
      ...data,
      status: CrossChainTransationStatus.PROTOCOL_CONFIRMATION_RECEIVED,
    };
  };

  private handleRelayTransaction: IHandler = async (data, ctx) => {
    const { verificationData, message } = ctx;

    if (!verificationData) {
      return {
        ...data,
        status: CrossChainTransactionError.UNKNOWN_ERROR,
        context: {
          error: `Invalid Verification Data in context for message hash ${message.hash}`,
        },
      };
    }

    const toChain = Number(message.destinationChainId.toString());
    const transaction = createCCMPGatewayTransaction(
      message,
      verificationData,
      ctx.executionIndex,
      ctx.sourceTxHash,
    );
    const response = await this.routeTransactionToRelayerMap[toChain][
      TransactionType.CROSS_CHAIN
    ]!.sendTransactionToRelayer(transaction);
    if (isError(response)) {
      return {
        ...data,
        status: CrossChainTransactionError.UNKNOWN_ERROR,
        context: {
          error: `Error while sending transaction to CCMP relayer: ${JSON.stringify(
            response.error,
          )}`,
        },
      };
    }
    log.info(
      `Transaction sent to CCMP relayer: ${JSON.stringify(response)} for message hash ${
        message.hash
      }`,
    );

    return {
      ...data,
      status: CrossChainTransationStatus.DESTINATION_TRANSACTION_QUEUED,
    };
  };

  async processTransaction(message: CCMPMessage, sourceChainTxHash: string) {
    // Check for previous runs
    const sourceChainId = parseInt(message.sourceChainId.toString(), 10);
    const state = await this.crossChainTransactionDAO.getByTransactionId(
      sourceChainId,
      message.hash,
    );

    // Build the monad
    const taskManager = new CCMPTaskManager(
      this.crossChainTransactionDAO,
      sourceChainTxHash,
      sourceChainId,
      message,
      state?.statusLog.length ? state.statusLog.length + 1 : 1,
      state,
    );

    const {
      TRANSACTION_VALIDATED,
      PROTOCOL_FEE_PAID,
      PROTOCOL_CONFIRMATION_RECEIVED,
      DESTINATION_TRANSACTION_QUEUED,
    } = CrossChainTransationStatus;

    // Process the transaction
    await taskManager
      .run('Validation', this.handleValidation, TRANSACTION_VALIDATED)
      .then((t) => t.run('Router Pre-Verfication', this.handleRouterPreVerification, PROTOCOL_FEE_PAID))
      .then((t) => t.run(
        'Fetch Verification Data',
        this.handleFetchVerificationData,
        PROTOCOL_CONFIRMATION_RECEIVED,
      ))
      .then((t) => t.run(
        'Relay Destination Transaction',
        this.handleRelayTransaction,
        DESTINATION_TRANSACTION_QUEUED,
      ));
  }
}
