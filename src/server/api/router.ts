import { Router } from "express";
import { adminApiRouter } from "./admin/router";
import { v2Router } from "./v2/router";

const routes = Router();

routes.use("/api/v2", v2Router);
routes.use("/admin", adminApiRouter);

export { routes };
