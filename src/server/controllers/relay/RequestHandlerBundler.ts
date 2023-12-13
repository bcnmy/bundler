import { Request, Response } from "express";
import {
  BiconomyMethodType,
  EthMethodType,
  TransactionMethodType,
} from "../../../common/types";
import { STATUSES } from "../../middleware";
import {
  bundleUserOperation,
  getChainId,
  estimateUserOperationGas,
  getUserOperationByHash,
  getUserOperationReceipt,
  getSupportedEntryPoints,
  getUserOperationsByApiKey,
  getGasAndGasPrices,
  getGasFeeValues,
  getUserOperationStatus,
} from "./BundlerRelay";

export const bundlerRequestHandler = async (req: Request, res: Response) => {
  const { method } = req.body;
  let response;
  switch (method) {
    case TransactionMethodType.BUNDLER:
      // here ideally it should add to mempool but would be bundling one user op per bundle
      response = await bundleUserOperation(req, res);
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
    case EthMethodType.GAS_AND_GAS_PRICES:
      response = await getGasAndGasPrices(req, res);
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
        code: STATUSES.BAD_REQUEST,
        error: "Wrong transaction type sent in request",
      });
  }

  return response;
};
