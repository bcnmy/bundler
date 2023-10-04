import { Request, Response } from 'express';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { gasPriceServiceMap } from '../../../../../common/service-manager';
import { parseError } from '../../../../../common/utils';
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger(module);

export const getGasFeeValues = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    const gasPrice = await gasPriceServiceMap[Number(chainId)]?.getGasPrice();

    if (typeof gasPrice !== 'string') {
      log.info(
        `Gas price for chainId: ${chainId} is: ${JSON.stringify(gasPrice)}`,
      );

      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     result: {
      //       callGasLimit,
      //       verificationGasLimit,
      //       preVerificationGas,
      //       validUntil,
      //       validAfter,
      //       maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas,
      //       maxFeePerGas: gasPrice?.maxFeePerGas,
      //     },
      //   },
      //   httpResponseCode: STATUSES.SUCCESS,
      // });

      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: '2.0',
        id: id || 1,
        result: {
          maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas as string,
          maxFeePerGas: gasPrice?.maxFeePerGas as string,
        },
      });
    }

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     result: {
    //       callGasLimit,
    //       verificationGasLimit,
    //       preVerificationGas,
    //       validUntil,
    //       validAfter,
    //       maxPriorityFeePerGas: gasPrice,
    //       maxFeePerGas: gasPrice,
    //     },
    //   },
    //   httpResponseCode: STATUSES.SUCCESS,
    // });

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: id || 1,
      result: {
        maxPriorityFeePerGas: gasPrice,
        maxFeePerGas: gasPrice,
      },
    });
  } catch (error) {
    log.error(`Error in getGasFeeValues handler ${parseError(error)}`);
    const { id } = req.body;

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     error: {
    //       code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    //       message: `Internal Server error: ${parseError(error)}`,
    //     },
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
