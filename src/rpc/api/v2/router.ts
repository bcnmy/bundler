import { Router } from "express";
import { simulateBundlerTransaction } from "../shared/simulate";
import { handleV2Request } from "./handler";
import { validateBundlerRequest } from "./shared/middleware";

export const v2Router = Router();

v2Router.post(
  "/:chainId/:dappAPIKey",
  validateBundlerRequest(),
  simulateBundlerTransaction(),
  handleV2Request,
);
