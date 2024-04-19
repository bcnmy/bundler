import { Router } from "express";
import { settings } from "./settings/handler";
import { status } from "./status/handler";

export const adminApiRouter = Router();

adminApiRouter.get("/", settings);
adminApiRouter.get("/status", status);
