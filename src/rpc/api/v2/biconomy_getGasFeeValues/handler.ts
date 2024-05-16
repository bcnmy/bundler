/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { BUNDLER_ERROR_CODES, STATUSES } from "../../shared/middleware";
import { logger } from "../../../../common/logger";
import { getGasPriceServiceMap } from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const getGasFeeValues = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    const gasPrice = await getGasPriceServiceMap(Number(chainId)).getGasPrice();

    if (typeof gasPrice !== "bigint") {
      log.info(
        `Gas price for chainId: ${chainId} is: ${customJSONStringify(
          gasPrice,
        )}`,
      );

      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: "2.0",
        id: id || 1,
        result: {
          maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas?.toString(),
          maxFeePerGas: gasPrice?.maxFeePerGas?.toString(),
        },
      });
    }

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        maxPriorityFeePerGas: gasPrice.toString(),
        maxFeePerGas: gasPrice.toString(),
      },
    });
  } catch (error) {
    log.error(`Error in getGasFeeValues handler ${parseError(error)}`);
    const { id } = req.body;

    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: id || 1,
      error: {
        code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
