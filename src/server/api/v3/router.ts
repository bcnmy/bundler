import { Router } from "express";
import { simulateBundlerV3Transaction } from "../shared/simulate";
import { handleV3Request } from "./handler";
import { validateBundlerRequest } from "./shared/middleware";

export const v3Router = Router();

v3Router.post(
  "/:chainId/:dappAPIKey",
  validateBundlerRequest(),
  simulateBundlerV3Transaction(),
  handleV3Request,
);
v3Router.get(
  "/:chainId/:bundlerApiKey",
  validateBundlerRequest(),
  handleV3Request,
);
