/* eslint-disable import/no-import-module-exports */
import { NextFunction, Request, Response } from "express";
import { getLogger } from "../../../../../common/logger";
import { transactionResubmitSchema } from "../../schema";
import { STATUSES } from "../../../shared/middleware/RequestHelpers";

const log = getLogger(module);

export const validateTransactionResubmit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = transactionResubmitSchema.validate(req.body);
    const valid = error == null;

    if (valid) {
      return next();
    }
    const { details } = error;
    const message = details.map((i) => i.message).join(",");
    return res.status(422).json({
      code: 422,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(STATUSES.BAD_REQUEST).send({
      code: STATUSES.BAD_REQUEST,
      error: e.errors,
    });
  }
};
