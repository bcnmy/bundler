import { STATUSES } from "../../server/api/shared/statuses";
import { IQueue } from "../interface";
import { logger } from "../logger";
import { SendUserOperation, RelayServiceResponseType } from "../types";
import { customJSONStringify } from "../utils";
import { IRelayService } from "./interface/IRelayService";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class BundlerRelayService implements IRelayService<SendUserOperation> {
  constructor(private queue: Pick<IQueue<SendUserOperation>, "publish">) {
    this.queue = queue;
  }

  /**
   * Publishes the transaction to the queue
   * @param data raw transaction data received in the request
   * @returns transaction id
   */
  async sendUserOperation(
    data: SendUserOperation,
  ): Promise<RelayServiceResponseType> {
    const _log = log.child({
      sendUserOperation: data,
    });

    _log.info(`Sending user operation to Bundler mempool`);

    let response: RelayServiceResponseType;
    try {
      await this.queue.publish(data);
      response = {
        code: STATUSES.SUCCESS,
        transactionId: data.transactionId,
      };
    } catch (err) {
      _log.error(
        { err },
        `Error while sending user operation to Bundler mempool`,
      );
      response = {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: `Internal server error: ${customJSONStringify(err)}`,
      };
    }
    return response;
  }
}
