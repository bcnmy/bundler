/* eslint-disable import/no-import-module-exports */
import { STATUSES } from "../../server/api/shared/middleware";
import { IQueue } from "../interface";
import { logger } from "../logger";
import {
  BundlerV3TransactionMessageType,
  RelayServiceResponseType,
} from "../types";
import { parseError } from "../utils";
import { IRelayService } from "./interface/IRelayService";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});
export class BundlerRelayServiceV3
  implements IRelayService<BundlerV3TransactionMessageType>
{
  queue: IQueue<BundlerV3TransactionMessageType>;

  constructor(queue: IQueue<BundlerV3TransactionMessageType>) {
    this.queue = queue;
  }

  /**
   * Publishes the transaction to the queue
   * @param data raw transaction data received in the request
   * @returns transaction id
   */
  async sendTransactionToRelayer(
    data: BundlerV3TransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(
      `Sending transaction to Bundler transaction queue with transactionId: ${data.transactionId} and transactionType: ${data.type}`,
    );
    let response: RelayServiceResponseType;
    try {
      await this.queue.publish(data);
      response = {
        code: STATUSES.SUCCESS,
        transactionId: data.transactionId,
      };
    } catch (error) {
      log.error(parseError(error));
      response = {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: `Internal server error: ${error}`,
      };
    }
    return response;
  }
}
