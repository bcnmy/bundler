import rTracer from "cls-rtracer";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import cons from "consolidate";
import logger from "pino-http";
import { randomUUID } from "node:crypto";
import { routes } from "./api/router";

const app = express();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
      dappId: string;
      networkId: string;
    }
  }
}

app.options("*", cors()); // include before other routes
app.use(cors());
app.use(rTracer.expressMiddleware());
app.use(
  logger({
    genReqId(req, res) {
      const existingID = req.id ?? req.headers["x-request-id"];
      if (existingID) return existingID;
      const id = randomUUID();
      res.setHeader("Request-Id", id);
      return id;
    },
  }),
);

app.engine("hbs", cons.handlebars);
app.set("view engine", "hbs");

// Add headers
app.use(
  (
    req: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: { setHeader: (arg0: string, arg1: any) => void },
    next: NextFunction,
  ) => {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Request methods you wish to allow
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, PATCH, DELETE",
    );

    // Request headers you wish to allow
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-Requested-With,content-type",
    );

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader("Access-Control-Allow-Credentials", true);

    // Pass to next layer of middleware
    next();
  },
);

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use("", routes);

app.route("/health").get((req, res) => {
  res.send("ok");
});

app.route("/:chainId/health").get((req, res) => {
  res.send("ok");
});

// error handler
app.use(
  (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction,
  ) => res.status(300).json(err.message),
);

export default app;
