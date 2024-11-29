import { Router } from "express";
import { adminApiRouter } from "./admin/router";
import { v2Router } from "./v2/router";
import { v3Router } from "./v3/router";

const routes = Router();

routes.use("/api/v2", v2Router);
routes.use("/api/v3", v3Router);
routes.use("/admin", adminApiRouter);

export { routes };
