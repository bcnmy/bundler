import { config } from '../../config';
import {
  CCMPMessage,
  TransactionType,
  CCMPRouterName,
  CrossChainTransationStatus,
  CrossChainTransactionError,
  isError,
  TransactionStatus,
} from '../../common/types';
import { logger } from '../../common/log-config';
import { CCMPTaskManager } from '../task-manager';
import type { routeTransactionToRelayerMap as globalRouteTransactionToRelayerMap } from '../../common/service-manager';
import type { ICCMPRouterService } from '../router-service/interfaces';
import type { ICrossChainTransactionDAO, ITransactionDAO } from '../../common/db';
import type { ICrossChainTransactionHandlerService } from './interfaces/ICrossChainTransactionHandlerService';
import type { ICrossChainProcessStep } from '../task-manager/types';
import type { CrossChainRetryHandlerQueue } from '../../common/queue/CrossChainRetryHandlerQueue';
import type { IIndexerService } from '../../common/indexer/types';
import type { ICrossChainGasEstimationService } from '../gas-estimation/interfaces/ICrossChainGasEstimationService';
import type { ICCMPGatewayService } from '../gateway/interfaces/ICCMPGatewayService';
import type { ICacheService } from '../../common/cache';

const log = logger(module);

export class CrossChainTransactionHandlerService implements ICrossChainTransactionHandlerService {
  private readonly eventName = 'CCMPMessageRouted';

  private readonly webHookEndpoint: string;

  constructor(
    private readonly chainId: number,
    private readonly cacheService: ICacheService,
    private readonly routerServiceMap: { [key in CCMPRouterName]?: ICCMPRouterService },
    private readonly routeTransactionToRelayerMap: typeof globalRouteTransactionToRelayerMap,
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO,
    private readonly crossChainRetryTransactionQueue: CrossChainRetryHandlerQueue,
    private readonly ccmpGatewayServiceMap: Record<number, ICCMPGatewayService>,
    private readonly indexerService: IIndexerService,
    private readonly crossChainGasEstimationServiceMap: Record<
    number,
    ICrossChainGasEstimationService
    >,
    private readonly transactionDao: ITransactionDAO,
  ) {
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

  private handleValidation: ICrossChainProcessStep = async (data, ctx) => {
    const { supportedRouters } = config.ccmp;
    const { message, status, sourceTxHash } = ctx;
    const { sourceChainId, destinationChainId, routerAdaptor } = message;

    // Check if the message has been processed already
    if (status.status === CrossChainTransationStatus.DESTINATION_TRANSACTION_CONFIRMED) {
      log.info(
        `Transaction ${sourceTxHash} with messageHash ${message} has been processed already`,
      );
      return {
        ...data,
        status: CrossChainTransationStatus.DESTINATION_TRANSACTION_CONFIRMED,
      };
    }

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

    // Check Gas Fee Payment
    // Get Estimated Gas Fee
    log.info(`Checking gas fee payment for message ${message.hash}`);
    const fromChainid = parseInt(message.sourceChainId.toString(), 10);
    const toChainId = parseInt(message.destinationChainId.toString(), 10);
    const gasEstimationService = this.crossChainGasEstimationServiceMap[toChainId];
    const gasFeeEstimate = await gasEstimationService.estimateCrossChainFee(sourceTxHash, message);
    log.info(`Gas fee estimate for message ${message.hash} is ${gasFeeEstimate.toString()}`);
    // Check how much is actually paid
    const gasFeePaid = (
      await this.ccmpGatewayServiceMap[fromChainid].getGasPaidByMessageHash(message.hash, [
        message.gasFeePaymentArgs.feeTokenAddress,
      ])
    ).get(message.gasFeePaymentArgs.feeTokenAddress);
    if (!gasFeePaid) {
      throw new Error(`Gas fee paid not found for message ${message.hash}`);
    }
    // Compare
    if (gasFeePaid.lt(gasFeeEstimate.amount)) {
      log.info(
        `Gas fee paid for message ${
          message.hash
        } is ${gasFeePaid.toString()} which is less than the estimated gas fee ${
          gasFeeEstimate.amount
        }`,
      );
      return {
        ...data,
        status: CrossChainTransactionError.INSUFFICIENT_GAS_FEE,
        context: {
          paid: gasFeePaid.toString(),
          required: gasFeeEstimate.amount.toString(),
        },
      };
    }
    log.info(
      `Gas fee paid for message ${message.hash} is ${gasFeePaid} which is greater than the estimated gas fee ${gasFeeEstimate.amount}`,
    );

    return {
      ...data,
      status: CrossChainTransationStatus.TRANSACTION_VALIDATED,
    };
  };

  private handleRouterPreVerification: ICrossChainProcessStep = async (data, ctx) => {
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

  private handleFetchVerificationData: ICrossChainProcessStep = async (data, ctx) => {
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

  private handleRelayTransaction: ICrossChainProcessStep = async (data, ctx) => {
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

    const toChain = parseInt(message.destinationChainId.toString(), 10);
    const transaction = await this.ccmpGatewayServiceMap[toChain].createReceiveMessageTransaction(
      message,
      verificationData,
      ctx.sourceTxHash,
    );

    // save transaction to transactions db. duh
    await this.transactionDao.save(toChain, {
      transactionId: message.hash,
      TransactionType: TransactionType.CROSS_CHAIN,
      status: TransactionStatus.PENDING,
      chainId: toChain,
      resubmitted: false,
      creationTime: Date.now(),
    });

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
    const lock = this.cacheService.getRedLock();
    if (!lock) {
      throw new Error('Redlock not initialized');
    }
    await lock.using([`key:ccmp:${message.hash}`], 5000, async (signal) => {
      signal.throwIfAborted();

      const sourceChainId = parseInt(message.sourceChainId.toString(), 10);

      // Build the monad
      const taskManager = new CCMPTaskManager(
        this.crossChainTransactionDAO,
        this.crossChainRetryTransactionQueue,
        sourceChainTxHash,
        sourceChainId,
        message,
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
    });
  }
}
