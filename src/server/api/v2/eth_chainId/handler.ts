/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import config from "config";
import { Hex } from "viem";
import { STATUSES } from "../../shared/middleware";
import { getLogger } from "../../../../common/logger";
import { customJSONStringify } from "../../../../common/utils";
import { ChainIdNotSupportedError } from "./errors";
import { InternalServerError } from "../shared/errors";
import { ChainIdResponse } from "./response";
import { RPCErrorResponse } from "../shared/response";

const filenameLogger = getLogger(module);

const isChainIdSupported = (chainId: number): boolean => {
  const supportedNetworks = config.get<Array<number>>("supportedNetworks");
  return supportedNetworks.includes(chainId);
};

// TODO: Use the network service to actually check if that chainId is supported and RPC works
export const getChainId = async (req: Request, res: Response) => {
  const { id } = req.body;
  const { chainId, bundlerApiKey } = req.params;

  const log = filenameLogger.child({
    chainId,
    requestId: id,
    apiKey: bundlerApiKey,
  });

  try {
    log.info(`chainId in number: ${chainId}`);

    if (!isChainIdSupported(parseInt(chainId, 10))) {
      return res
        .status(STATUSES.NOT_FOUND)
        .json(new RPCErrorResponse(new ChainIdNotSupportedError(chainId), id));
    }

    const chainIdInHex: Hex = `0x${parseInt(chainId, 10).toString(16)}`;
    log.info(`chainId in hex: ${chainIdInHex}`);

    return res
      .status(STATUSES.SUCCESS)
      .json(new ChainIdResponse(chainIdInHex, id));
  } catch (error) {
    log.error(`Error in getChainId handler ${customJSONStringify(error)}`);

    return res
      .status(STATUSES.INTERNAL_SERVER_ERROR)
      .json(new RPCErrorResponse(new InternalServerError(error), id));
  }
};
