import { NextFunction, Request, Response } from "express";
import config from "config";
import { logger } from "../../../../common/logger";

import { parseError } from "../../../../common/utils";
import { RPCErrorResponse } from "./response";
import { ChainIdNotSupportedError } from "./errors";
import { methodToSchema } from "./schema";
import { STATUSES } from "../../shared/statuses";
import { BUNDLER_ERROR_CODES } from "../../shared/errors/codes";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// validateChainId middleware checks if the chainId provided in the request is supported by this bundler
export const validateChainId =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supportedNetworks = config.get<Array<number>>("supportedNetworks");
      const chainId = parseInt(req.params.chainId, 10);

      if (chainId && !supportedNetworks.includes(chainId)) {
        return res
          .status(STATUSES.BAD_REQUEST)
          .json(
            new RPCErrorResponse(
              new ChainIdNotSupportedError(req.params.chainId),
              0,
            ),
          );
      }
    } catch (err: unknown) {
      log.error(`Error in validateChainId: ${parseError(err)}`);
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
        jsonrpc: "2.0",
        id: 0,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: parseError(err),
        },
      });
    }

    return next();
  };

export const validateBundlerRequest =
  () => async (req: Request, res: Response, next: NextFunction) => {
    const { method, id } = req.body;
    const { chainId } = req.params;

    const _log = log.child({
      chainId,
      method,
      id,
    });

    try {
      const validationSchema = methodToSchema[method];
      if (!validationSchema) {
        _log.warn(`Method not supported: ${method}`);
        return res.status(STATUSES.BAD_REQUEST).send({
          jsonrpc: "2.0",
          id: id || 1,
          error: {
            code: BUNDLER_ERROR_CODES.METHOD_NOT_FOUND,
            message: `Method not supported: ${method}`,
          },
        });
      }

      const validationResponse = validationSchema.validate(req.body);
      const { error } = validationResponse;
      const valid = error === undefined;
      if (valid) {
        return next();
      }

      _log.debug({ error }, `Invalid request`);
      const { details } = error;
      let message;
      if (details) {
        message = details
          .map((i) => (i.context ? i.context.message : i.message))
          .join(",");
      } else {
        message = error.message || error.toString();
      }
      return res.send({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: BUNDLER_ERROR_CODES.INVALID_USER_OP_FIELDS,
          message,
        },
      });
    } catch (e: unknown) {
      const { id } = req.body;
      _log.error(e);
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: parseError(e),
        },
      });
    }
  };
