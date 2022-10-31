import { ethers } from 'ethers';
import { config } from '../../../../config';
import { IndexerService } from '../../../../common/indexer/IndexerService';
import {
  CCMPMessage,
  GasFeePaymentArgsStruct,
  TransactionType,
  CCMPTransactionMessageType,
  CCMPRouterName,
  CrossChainTransationStatus,
  CrossChainTransactionError,
  isError,
} from '../../../../common/types';
import { logger } from '../../../../common/log-config';
import type { routeTransactionToRelayerMap as globalRouteTransactionToRelayerMap } from '../../../../common/service-manager';
import type { ICCMPRouterService } from './types';
import type { ICrossChainTransaction, ICrossChainTransactionDAO } from '../../../../common/db';

const log = logger(module);

interface ISourceTx {
  txHash: string;
  gasUsage: number;
  chainId: number;
  from: string;
  scAddress: string;
  eventName: string;
  eventData: any;
}

interface IStatus {
  readonly sourceTxHash: string;
  context?: Object;
  timestamp?: number;
  status?: CrossChainTransationStatus | CrossChainTransactionError;
  error?: boolean;
}

interface IStatusLogCtx {
  readonly message: CCMPMessage;
  readonly sourceTxHash: string;
  verificationData?: string | Uint8Array;
}

interface IStatusLogDeps {
  readonly crossChainTransactionDAO: ICrossChainTransactionDAO;
}

interface IHandler {
  (data: IStatus, ctx: IStatusLogCtx): Promise<IStatus>;
}

interface IStatusLog {
  logs: IStatus[];
  ctx: IStatusLogCtx;
  deps: IStatusLogDeps;
  run: (
    name: string,
    handler: IHandler,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus
  ) => Promise<IStatusLog>;
}

class CCMPService {
  private readonly eventName = 'CCMPMessageRouted';

  private readonly indexerService: IndexerService;

  private readonly webHookEndpoint: string;

  constructor(
    private readonly chainId: number,
    private readonly routerServiceMap: { [key in CCMPRouterName]?: ICCMPRouterService },
    private readonly routeTransactionToRelayerMap: typeof globalRouteTransactionToRelayerMap,
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO
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
      `CCMP: Starting Pre-Verification for source tx hash ${sourceTxHash} message hash: ${message.hash}`
    );
    await routerService.handlePreVerification(sourceTxHash, message);
    log.info(
      `CCMP: Pre-Verification for source tx hash ${sourceTxHash} message hash: ${message.hash} completed`
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
    ctx.verificationData = await routerService.getVerificationData(sourceTxHash, message);
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
    const transaction = CCMPService.createTransaction(message, verificationData);
    const response = await this.routeTransactionToRelayerMap[toChain][
      TransactionType.CROSS_CHAIN
    ].sendTransactionToRelayer(transaction);
    if (isError(response)) {
      return {
        ...data,
        status: CrossChainTransactionError.UNKNOWN_ERROR,
        context: {
          error: `Error while sending transaction to CCMP relayer: ${JSON.stringify(
            response.error
          )}`,
        },
      };
    }
    log.info(
      `Transaction sent to CCMP relayer: ${JSON.stringify(response)} for message hash ${
        message.hash
      }`
    );

    return {
      ...data,
      status: CrossChainTransationStatus.DESTINATION_TRANSACTION_RELAYED,
    };
  };

  private static wrap = (
    tx: ISourceTx,
    state: ICrossChainTransaction | null,
    message: CCMPMessage,
    deps: IStatusLogDeps
  ): IStatusLog => ({
    deps,
    ctx: {
      sourceTxHash: tx.txHash,
      message,
    },
    logs: [{ sourceTxHash: tx.txHash, status: CrossChainTransationStatus.__START }],
    async run(
      name: string,
      handler: IHandler,
      handlerExpectedPostCompletionStatus: CrossChainTransationStatus
    ): Promise<IStatusLog> {
      const latestEntry = this.logs[this.logs.length - 1];

      // If an error occured in the previous step, skip this step
      if (latestEntry.error) {
        return this;
      }

      // Run the Handler
      let partialStatusLog: IStatus;
      try {
        log.info(
          `Running ${name} handler with data ${JSON.stringify(
            latestEntry
          )} and context ${JSON.stringify(this.ctx)}`
        );
        partialStatusLog = await handler(latestEntry, this.ctx);
      } catch (e) {
        partialStatusLog = {
          ...latestEntry,
          status: CrossChainTransactionError.UNKNOWN_ERROR,
          context: {
            exception: JSON.stringify(e),
          },
        };
      }
      const statusLog = {
        ...partialStatusLog,
        timestamp: Date.now(),
        error: partialStatusLog.status !== handlerExpectedPostCompletionStatus,
      };
      log.info(`Status Log from ${name} handler is ${JSON.stringify(statusLog)}`);
      this.logs.push(statusLog);

      // Updating state in DB:
      log.info(`Saving updated state for ${name} handler to DB...`);
      const updatedState = CCMPService.mergeState(message, tx, this, state);
      await deps.crossChainTransactionDAO.updateByTransactionId(
        tx.chainId,
        updatedState.transactionId,
        updatedState
      );
      log.info(`Updated state saved for ${name} handler to DB`);
      return this;
    },
  });

  private static mergeState = (
    message: CCMPMessage,
    tx: ISourceTx,
    txLog: IStatusLog,
    state: ICrossChainTransaction | null
  ): ICrossChainTransaction => ({
    transactionId: message.hash,
    sourceTransactionHash: tx.txHash,
    statusLog: [
      ...(state?.statusLog || []),
      {
        executionIndex: (state?.statusLog?.length || 0) + 1,
        logs: txLog.logs as any,
      },
    ],
    creationTime: state?.creationTime || Date.now(),
    updationTime: Date.now(),
    message,
    // TODO: Verify if this works in case of wormhole
    verificationData: txLog.ctx.verificationData?.toString(),
  });

  async processTransaction(tx: ISourceTx) {
    const message = CCMPService.parseIndexerEvent(tx.eventData);

    // Check for previous runs
    const state = await this.crossChainTransactionDAO.getByTransactionId(tx.chainId, message.hash);

    // Build the monad
    const txLog = CCMPService.wrap(tx, state, message, {
      crossChainTransactionDAO: this.crossChainTransactionDAO,
    });

    const {
      TRANSACTION_VALIDATED,
      PROTOCOL_FEE_PAID,
      PROTOCOL_CONFIRMATION_RECEIVED,
      DESTINATION_TRANSACTION_RELAYED,
    } = CrossChainTransationStatus;

    // Process the transaction
    await txLog.run('Validation', this.handleValidation, TRANSACTION_VALIDATED);

    await txLog.run('Router Pre-Verfication', this.handleRouterPreVerification, PROTOCOL_FEE_PAID);

    await txLog.run(
      'Fetch Verification Data',
      this.handleFetchVerificationData,
      PROTOCOL_CONFIRMATION_RECEIVED
    );

    await txLog.run(
      'Relay Destination Transaction',
      this.handleRelayTransaction,
      DESTINATION_TRANSACTION_RELAYED
    );
  }
}

export { CCMPService };
