import { Request, Response } from "express";
import { EthMethodType, TransactionMethodType } from "../../../common/types";
import { BUNDLER_ERROR_CODES, STATUSES } from "../shared/middleware";
import { relayAATransaction } from "./eth_sendUserOperation/handler";
import { relaySCWTransaction } from "./eth_sendSmartContractWalletTransaction/handler";
import { getGasAndGasPrices } from "./eth_getUserOpGasFields/handler";

export const handleV1Request = async (req: Request, res: Response) => {
  const { method } = req.body;
  let response;
  if (method === TransactionMethodType.AA) {
    response = await relayAATransaction(req, res);
  } else if (method === TransactionMethodType.SCW) {
    response = await relaySCWTransaction(req, res);
  } else if (method === EthMethodType.GAS_AND_GAS_PRICES) {
    response = await getGasAndGasPrices(req, res);
  } else {
    return res.status(STATUSES.BAD_REQUEST).send({
      code: BUNDLER_ERROR_CODES.METHOD_NOT_FOUND,
      error: `method: ${method} not supported`,
    });
  }
  return response;
};
