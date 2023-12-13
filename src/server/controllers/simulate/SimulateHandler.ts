import { NextFunction, Request, Response } from "express";
import { EthMethodType, TransactionMethodType } from "../../../common/types";
import { STATUSES } from "../../middleware";
import { simulateAATransaction } from "./SimulateAATransaction";
import { simulateSCWTransaction } from "./SimulateSCWTransaction";

export const simulateTransaction =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { method } = req.body;
      let response = null;
      if (method === TransactionMethodType.AA) {
        response = await simulateAATransaction(req);
      } else if (method === TransactionMethodType.SCW) {
        response = await simulateSCWTransaction(req);
      } else if (method === EthMethodType.GAS_AND_GAS_PRICES) {
        return next();
      }
      if (!response) {
        return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
          code: STATUSES.INTERNAL_SERVER_ERROR,
          error: "Response not received from simulation service",
        });
      }
      if ((response as any).code !== STATUSES.SUCCESS) {
        return res.status((response as any).code).send({
          code: (response as any).code,
          error: (response as any).message,
        });
      }
      return next();
    } catch (error) {
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: `Internal server error: ${JSON.stringify(error)}`,
      });
    }
  };
