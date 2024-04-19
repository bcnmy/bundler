import { Router } from "express";
import { simulateTransaction } from "../shared/simulate";
import { transactionResubmitApi } from "./resubmit/handler";
import { feeOptionsApi } from "./fee-options/handler";
import { transactionStatusApi } from "./status";
import { handleV1Request } from "./handler";
import { validateFeeOption } from "./shared/middleware/ValidateFeeOptionRequest";
import { validateRelayRequest } from "./shared/middleware/ValidateRelayRequest";
import { validateTransactionResubmit } from "./shared/middleware/ValidateTransactionResubmitRequest";
import { validateTransactionStatus } from "./shared/middleware/ValidateTransactionStatusRequest";

export const v1Router = Router();

v1Router.get("/feeOptions", validateFeeOption, feeOptionsApi);

v1Router.get("/status", validateTransactionStatus, transactionStatusApi);

v1Router.post(
  "/",
  validateRelayRequest(),
  simulateTransaction(),
  handleV1Request,
);

v1Router.post("/resubmit", validateTransactionResubmit, transactionResubmitApi);
