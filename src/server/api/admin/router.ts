import { Router } from "express";
import { settings } from "./settings/handler";
import { startupProbe } from "./startup/handler";
import { health } from "./health/handler";
import { validateChainId } from "../v2/shared/middleware";
import { info } from "./info/handler";
import { cancelTransaction } from "./cancel/handler";

export const adminApiRouter = Router();

adminApiRouter.get("/", settings);
adminApiRouter.get("/startup", startupProbe);
adminApiRouter.get("/health/:chainId?", validateChainId(), health);
adminApiRouter.get("/info", info);
adminApiRouter.post("/cancel", cancelTransaction);
