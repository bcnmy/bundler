import { Request, Response } from 'express';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { bundlerSimulatonAndValidationServiceMap, entryPointMap, gasPriceServiceMap } from '../../../../../common/service-manager';
import { parseError } from '../../../../../common/utils';
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger(module);

export const estimateUserOperationGas = async (req: Request, res: Response) => {
  const { id } = req.body;
  const { chainId /* apiKey */ } = req.params;
  // const bundlerRequestId = req.body.params[6];

  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];

    const entryPointContracts = entryPointMap[parseInt(chainId, 10)];

    let entryPointContract;
    for (let entryPointContractIndex = 0;
      entryPointContractIndex < entryPointContracts.length;
      entryPointContractIndex += 1) {
      if (entryPointContracts[entryPointContractIndex].address.toLowerCase()
       === entryPointAddress.toLowerCase()) {
        entryPointContract = entryPointContracts[entryPointContractIndex].entryPointContract;
        break;
      }
    }
    if (!entryPointContract) {
      return {
        code: STATUSES.BAD_REQUEST,
        message: 'Entry point not supported by Bundler',
      };
    }

    const estimatedUserOpGas = await bundlerSimulatonAndValidationServiceMap[
      parseInt(chainId, 10)
    ].estimateUserOperationGas(
      {
        userOp,
        entryPointContract,
        chainId: parseInt(chainId, 10),
      },
    );

    const {
      code,
      message,
      data,
    } = estimatedUserOpGas;

    if (code !== STATUSES.SUCCESS) {
      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     error: {
      //       code: code || BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      //       message,
      //     },
      //   },
      //   httpResponseCode: STATUSES.BAD_REQUEST,
      // });

      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: code || BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
          message,
        },
      });
    }

    const {
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      validUntil,
      validAfter,
    } = data;

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
          callGasLimit,
          verificationGasLimit,
          preVerificationGas,
          validUntil,
          validAfter,
          maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas,
          maxFeePerGas: gasPrice?.maxFeePerGas,
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
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        validUntil,
        validAfter,
        maxPriorityFeePerGas: gasPrice,
        maxFeePerGas: gasPrice,
      },
    });
  } catch (error) {
    log.error(`Error in estimateUserOperationGas handler ${parseError(error)}`);
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
