import { Router } from "express";
import { settings } from "./settings/handler";
import { status } from "./status/handler";
import { startupProbe } from "./startup/handler";

export const adminApiRouter = Router();

adminApiRouter.get("/", settings);
adminApiRouter.get("/status", status);
adminApiRouter.get("/startup", startupProbe);
