import { Request, Response } from "express";
import config from "config";
import {
  eth_sendUserOperation,
  getChainId,
  estimateUserOperationGas,
  getUserOperationByHash,
  getUserOperationReceipt,
  getSupportedEntryPoints,
  getUserOperationsByApiKey,
  getGasFeeValues,
  getUserOperationStatus,
} from ".";
import { RPCErrorResponse } from "./shared/response";
import { ChainIdNotSupportedError } from "./shared/errors";
import { BundlerMethods } from "../methods/bundler";
import { STATUSES } from "../shared/statuses";
import { BUNDLER_ERROR_CODES } from "../shared/errors/codes";
import { EthMethods } from "../methods/eth";
import { BiconomyMethods } from "../methods/biconomy";

const isChainIdSupported = (chainId: number): boolean => {
  const supportedNetworks = config.get<Array<number>>("supportedNetworks");
  return supportedNetworks.includes(chainId);
};

export const handleV2Request = async (req: Request, res: Response) => {
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
      response = await eth_sendUserOperation(req, res);
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
    case BiconomyMethods.biconomy_getUserOperationsByApiKey:
      response = await getUserOperationsByApiKey(req, res);
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
