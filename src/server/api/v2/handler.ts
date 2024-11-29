import { Request, Response } from "express";
import config from "config";
import {
  BiconomyMethodType,
  EthMethodType,
  TransactionMethodType,
} from "../../../common/types";
import { BUNDLER_ERROR_CODES, STATUSES } from "../shared/middleware";
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
    case TransactionMethodType.BUNDLER:
      // here ideally it should add to mempool but would be bundling one user op per bundle
      response = await eth_sendUserOperation(req, res);
      break;
    case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
      response = await estimateUserOperationGas(req, res);
      break;
    case EthMethodType.GET_USER_OPERATION_BY_HASH:
      response = await getUserOperationByHash(req, res);
      break;
    case EthMethodType.GET_USER_OPERATION_RECEIPT:
      response = await getUserOperationReceipt(req, res);
      break;
    case EthMethodType.SUPPORTED_ENTRY_POINTS:
      response = await getSupportedEntryPoints(req, res);
      break;
    case EthMethodType.CHAIN_ID:
      response = await getChainId(req, res);
      break;
    case EthMethodType.GET_USER_OPERATIONS_BY_API_KEY:
      response = await getUserOperationsByApiKey(req, res);
      break;
    case BiconomyMethodType.GET_GAS_FEE_VALUES:
      response = await getGasFeeValues(req, res);
      break;
    case BiconomyMethodType.GET_USER_OPERATION_STATUS:
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
