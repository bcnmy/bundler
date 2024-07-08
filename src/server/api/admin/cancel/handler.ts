/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import {
  EVMRelayerManagerMap,
  transactionServiceMap,
} from "../../../../common/service-manager";
import { customJSONStringify } from "../../../../common/utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const cancelTransaction = async (req: Request, res: Response) => {
  try {
    const { relayerAddress, nonce, chainId } = req.body;
    log.info(`Received /cancel request: ${customJSONStringify(req.body)}`);

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const relayerManager = EVMRelayerManagerMap["RM1"][chainId];

    const relayer = relayerManager.getRelayer(relayerAddress);
    if (!relayer) {
      return res.status(400).json({
        error: `Relayer with address=${relayerAddress} not found`,
      });
    }

    const transactionService = transactionServiceMap[chainId];
    if (!transactionService) {
      return res.status(400).json({
        error: `Transaction service for chainId=${chainId} not found`,
      });
    }

    const receipt = await transactionService.cancelTransaction(relayer, nonce);
    return res.json(receipt);
  } catch (err) {
    log.error(`Error in /cancel handler: ${customJSONStringify(err)}`);
    return res.status(500).json({
      error: customJSONStringify(err),
    });
  }
};
