/* eslint-disable import/no-import-module-exports */
import { ConsumeMessage } from "amqplib";
import { CentClient } from "cent.js";
import { getLogger } from "../../common/logger";
import { IQueue } from "../../common/queue";
import {
  EVMRawTransactionType,
  SocketEventType,
  TransactionQueueMessageType,
} from "../../common/types";
import { config } from "../../config";
import { IEVMAccount } from "../account";
import { IRelayerManager } from "../relayer-manager";
import { ISocketConsumer } from "./interface/ISocketConsumer";
import { SocketConsumerParamsType } from "./types";
import { customJSONStringify } from "../../common/utils";

const log = getLogger(module);
export class SocketConsumer implements ISocketConsumer {
  chainId: number;

  socketClient: CentClient | null;

  private queue: IQueue<TransactionQueueMessageType>;

  EVMRelayerManagerMap: {
    [name: string]: {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    };
  };

  constructor(socketConsumerParams: SocketConsumerParamsType) {
    const { options, queue } = socketConsumerParams;
    try {
      this.socketClient = new CentClient({
        url: config.socketService.httpUrl,
        token: config.socketService.apiKey,
      });
    } catch (error) {
      this.socketClient = null;
      log.error(`Error in setting up cent client`);
    }
    this.chainId = options.chainId;
    this.queue = queue;
    this.EVMRelayerManagerMap = options.EVMRelayerManagerMap;
  }

  onMessageReceived = async (msg?: ConsumeMessage) => {
    if (msg) {
      try {
        const transactionDataReceivedFromQueue: TransactionQueueMessageType =
          JSON.parse(msg.content.toString());
        log.info(
          `Message received from transction queue in socket service on chain Id ${
            this.chainId
          }: ${customJSONStringify(transactionDataReceivedFromQueue)}`,
        );
        this.queue.ack(msg);
        if (
          transactionDataReceivedFromQueue.event ===
            SocketEventType.onTransactionMined &&
          transactionDataReceivedFromQueue.receipt?.from
        ) {
          log.info(
            `Calling Relayer Manager ${transactionDataReceivedFromQueue.relayerManagerName} for chainId: ${this.chainId} and relayerAddress: ${transactionDataReceivedFromQueue.receipt.from} onTransactionMined event to update the balance and pending count`,
          );
          await this.EVMRelayerManagerMap[
            transactionDataReceivedFromQueue.relayerManagerName
          ][this.chainId].postTransactionMined(
            transactionDataReceivedFromQueue.receipt?.from,
          );
        }
        if (this.socketClient === null) {
          throw new Error(`socketClient instance is null`);
        }
        await this.socketClient.publish({
          channel: `transaction:${transactionDataReceivedFromQueue.transactionId}`,
          data: {
            transactionId: transactionDataReceivedFromQueue.transactionId,
            transactionHash: transactionDataReceivedFromQueue?.transactionHash,
            event: transactionDataReceivedFromQueue.event,
            receipt: transactionDataReceivedFromQueue?.receipt,
          },
        });
        log.info(
          `Socket event: ${transactionDataReceivedFromQueue.event} successfully emitted for transactionId: ${transactionDataReceivedFromQueue.transactionId} on chainId: ${this.chainId}`,
        );
      } catch (error) {
        log.error(
          `Failed to send to client on socket server with error: ${customJSONStringify(
            error,
          )}`,
        );
      }
    } else {
      log.info(
        `No msg received from queue in socket service on chainId: ${this.chainId}`,
      );
    }
  };
}
