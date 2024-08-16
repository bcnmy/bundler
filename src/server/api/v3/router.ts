import { Router } from "express";
import { simulateBundlerTransaction } from "../shared/simulate";
import { handleV3Request } from "./handler";
import { validateBundlerRequest } from "./shared/middleware";

export const v3Router = Router();

v3Router.post(
  "/:chainId/:dappAPIKey",
  validateBundlerRequest(),
  simulateBundlerTransaction(),
  handleV3Request,
);
v3Router.get(
  "/:chainId/:bundlerApiKey",
  validateBundlerRequest(),
  handleV3Request,
);
