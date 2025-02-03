import { Request, Response } from "express";
import config from "config";
import {
  bundleUserOperation,
  getChainId,
  estimateUserOperationGas,
  getUserOperationByHash,
  getUserOperationReceipt,
  getSupportedEntryPoints,
  getGasFeeValues,
  getUserOperationStatus,
} from ".";
import { RPCErrorResponse } from "./shared/response";
import { ChainIdNotSupportedError } from "./shared/errors";
import { STATUSES } from "../shared/statuses";
import { BundlerMethods } from "../methods/bundler";
import { EthMethods } from "../methods/eth";
import { BiconomyMethods } from "../methods/biconomy";
import { BUNDLER_ERROR_CODES } from "../shared/errors/codes";

const isChainIdSupported = (chainId: number): boolean => {
  const supportedNetworksV07 = config.get<Array<number>>(
    "supportedNetworksV07",
  );
  return supportedNetworksV07.includes(chainId);
};

export const handleV3Request = async (req: Request, res: Response) => {
  const { method, id } = req.body;
  const { chainId } = req.params;

  if (!isChainIdSupported(parseInt(chainId, 10))) {
    return res
      .status(STATUSES.BAD_REQUEST)
      .json(new RPCErrorResponse(new ChainIdNotSupportedError(chainId), id));
  }

  let response;
  switch (method) {
    case BundlerMethods.eth_sendUserOperation:
      // here ideally it should add to mempool but would be bundling one user op per bundle
      response = await bundleUserOperation(req, res);
      break;
    case BundlerMethods.eth_estimateUserOperationGas:
      response = await estimateUserOperationGas(req, res);
      break;
    case BundlerMethods.eth_getUserOperationByHash:
      response = await getUserOperationByHash(req, res);
      break;
    case BundlerMethods.eth_getUserOperationReceipt:
      response = await getUserOperationReceipt(req, res);
      break;
    case BundlerMethods.eth_supportedEntryPoints:
      response = await getSupportedEntryPoints(req, res);
      break;
    case EthMethods.eth_chainId:
      response = await getChainId(req, res);
      break;
    case BiconomyMethods.biconomy_getGasFeeValues:
      response = await getGasFeeValues(req, res);
      break;
    case BiconomyMethods.biconomy_getUserOperationStatus:
      response = await getUserOperationStatus(req, res);
      break;
    default:
      return res.status(STATUSES.BAD_REQUEST).send({
        code: BUNDLER_ERROR_CODES.METHOD_NOT_FOUND,
        error: `method: ${method} not supported`,
      });
  }

  return response;
};
