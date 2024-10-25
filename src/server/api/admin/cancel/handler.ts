import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import {
  EVMRelayerManagerMap,
  networkServiceMap,
  transactionServiceMap,
} from "../../../../common/service-manager";
import { customJSONStringify } from "../../../../common/utils";
import { config } from "../../../../config";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * cancelTransaction is used when one of the relayers gets stuck (forever) and the transaction is not mined.
 * @returns Cancelation transaction receipt or 500 error
 */
export const cancelTransaction = async (req: Request, res: Response) => {
  try {
    const { adminAddress, relayerAddress, nonce, chainId } = req.body;
    log.info(`Received /cancel request: ${customJSONStringify(req.body)}`);

    if (!adminAddress) {
      return res.status(400).json({
        error: "Admin address is required",
      });
    }

    if (!config.adminAddresses.includes(adminAddress)) {
      return res.status(401).json({
        error: "Unauthorized (invalid admin address)",
      });
    }

    // get the value of the Authentication header (signature)
    const signature = req.headers.authorization;
    if (!signature) {
      return res.status(401).json({
        error: "Unauthorized (empty Authorization header)",
      });
    }

    const networkService = networkServiceMap[chainId];
    if (!networkService) {
      return res.status(400).json({
        error: `Network service for chainId=${chainId} not found`,
      });
    }

    const valid = await networkService.verifySignature(
      adminAddress,
      JSON.stringify(req.body),
      signature,
    );
    if (!valid) {
      return res.status(401).json({
        error: "Unauthorized (invalid signature)",
      });
    }

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
