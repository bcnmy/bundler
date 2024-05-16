import { Router } from "express";
import { v2Router } from "./v2/router";

const routes = Router();

routes.use("/api/v2", v2Router);

export { routes };
