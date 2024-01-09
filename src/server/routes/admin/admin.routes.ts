import { Router } from "express";
import {
  settings,
  status,
  deleteCacheAPI,
  getCacheAPI,
  postCacheAPI,
} from "../../controllers";

export const adminApiRouter = Router();

adminApiRouter.get("/", settings);
adminApiRouter.get("/status", status);

adminApiRouter.post("/cache", postCacheAPI);
adminApiRouter.get("/cache", getCacheAPI);
adminApiRouter.delete("/cache", deleteCacheAPI);
