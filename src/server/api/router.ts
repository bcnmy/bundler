import { Router } from "express";
import { v1Router } from "./v1/router";
import { adminApiRouter } from "./admin/router";
import { v2Router } from "./v2/router";

const routes = Router();

routes.use("/api/v1/relay", v1Router);
routes.use("/api/v2", v2Router);
routes.use("/admin", adminApiRouter);

export { routes };
