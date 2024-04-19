/* eslint-disable import/no-import-module-exports */
import { Request } from "express";
import { logger } from "../../../../common/logger";
import {
  axiosPostCall,
  customJSONStringify,
  parseError,
} from "../../../../common/utils";
import { config } from "../../../../config";
import { STATUSES } from "../middleware";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const authenticate = async (req: Request) => {
  try {
    const { chainId, apiKey } = req.params;
    const { method, id, params } = req.body;
    log.info(`chainId from request params: ${chainId}`);
    log.info(`apiKey from request params: ${apiKey}`);
    log.info(`method from request body: ${method}`);
    log.info(`id from request body: ${id}`);
    log.info(`params from request body: ${customJSONStringify(params)}`);

    const aaDashboardBackendBaseUrl = config.aaDashboardBackend.url;

    const response = await axiosPostCall(
      `${aaDashboardBackendBaseUrl}/${chainId}/${apiKey}`,
      {
        jsonRpcMethod: method,
        jsonRpcId: id,
        jsponRpcParams: params,
        rawRequest: req.body,
      },
    );

    const { isAuthenticated, message, bundlerRequestId } = response.data;

    log.info(
      `Response from AA Dashboard Backend: ${customJSONStringify(response)}`,
    );

    if (!isAuthenticated) {
      return {
        code: STATUSES.UNAUTHORIZED,
        message: `APIKey not authenticated with message: ${message}`,
        data: {
          bundlerRequestId,
        },
      };
    }

    req.body.params[6] = bundlerRequestId;

    return {
      code: STATUSES.ACTION_COMPLETE,
      message: "Authenticated",
      data: {
        bundlerRequestId,
      },
    };
  } catch (error) {
    log.error(
      `Error in authentication for bundler request: ${parseError(error)}`,
    );
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      message: "Not authenticated",
      data: null,
    };
  }
};
