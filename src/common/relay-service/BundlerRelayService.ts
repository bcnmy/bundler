import { STATUSES } from "../../server/api/shared/middleware";
import { IQueue } from "../interface";
import { logger } from "../logger";
import {
  BundlerTransactionMessageType,
  RelayServiceResponseType,
} from "../types";
import { parseError } from "../utils";
import { IRelayService } from "./interface/IRelayService";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});
export class BundlerRelayService
  implements IRelayService<BundlerTransactionMessageType>
{
  queue: IQueue<BundlerTransactionMessageType>;

  constructor(queue: IQueue<BundlerTransactionMessageType>) {
    this.queue = queue;
  }

  /**
   * Publishes the transaction to the queue
   * @param data raw transaction data received in the request
   * @returns transaction id
   */
  async sendTransactionToRelayer(
    data: BundlerTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(
      `Sending transaction to Bundler transaction queue with transactionId: ${data.transactionId}`,
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
