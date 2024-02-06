import { Router } from "express";
import { relayApiRouter } from "./relay/relay.routes";
import { adminApiRouter } from "./admin/admin.routes";
import { bundlerApiRouter } from "./bundler/bundler.routes";

const routes = Router();

routes.use("/api/v1/relay", relayApiRouter);
routes.use("/admin", adminApiRouter);
routes.use("/api/v2", bundlerApiRouter);

export { routes };
