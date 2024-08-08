import { Router } from "express";
import { simulateBundlerTransaction } from "../shared/simulate";
import { handleV2Request } from "./handler";
import { validateBundlerRequest } from "./shared/middleware";

export const v3Router = Router();

v3Router.post(
  "/:chainId/:dappAPIKey",
  validateBundlerRequest(),
  simulateBundlerTransaction(),
  handleV2Request,
);
v3Router.get(
  "/:chainId/:bundlerApiKey",
  validateBundlerRequest(),
  handleV2Request,
);
