import { Request, Response } from 'express';
import { logger } from '../../../../../common/log-config';
import {
  bundlerGasEstimationServiceMap,
  entryPointMap,
  gasPriceServiceMap,
} from '../../../../../common/service-manager';
import { config } from '../../../../../config';
import { STATUSES } from '../../../middleware';

const { supportedNetworks } = config;

const log = logger(module);

export const getGasAndGasPrices = async (req: Request, res: Response) => {
  try {
    // const { chainId } = req.params;
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];

    if (!supportedNetworks.includes(Number(chainId))) {
      return res.status(STATUSES.NOT_FOUND).json({
        code: STATUSES.NOT_FOUND,
        message: `ChainId ${chainId} is not supported`,
      });
    }

    const entryPointContracts = entryPointMap[parseInt(chainId, 10)];

    let entryPointContract;
    for (
      let entryPointContractIndex = 0;
      entryPointContractIndex < entryPointContracts.length;
      entryPointContractIndex += 1
    ) {
      if (
        entryPointContracts[entryPointContractIndex].address.toLowerCase()
        === entryPointAddress.toLowerCase()
      ) {
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

    // use this file to estimate L2 fee
    const estimatedUserOpGas = await bundlerGasEstimationServiceMap[
      parseInt(chainId, 10)
    ].estimateUserOperationGas({
      userOp,
      entryPointContract,
      chainId: parseInt(chainId, 10),
    });

    const { code, message, data } = estimatedUserOpGas;

    if (code !== STATUSES.SUCCESS) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: code || STATUSES.BAD_REQUEST,
        message,
      });
    }

    const { callGasLimit, verificationGasLimit, preVerificationGas } = data;

    const gasPrice = await gasPriceServiceMap[Number(chainId)]?.getGasPrice();

    if (typeof gasPrice !== 'string') {
      log.info(
        `Gas price for chainId: ${chainId} is: ${JSON.stringify(gasPrice)}`,
      );

      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: '2.0',
        id: 1,
        result: {
          maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas,
          maxFeePerGas: gasPrice?.maxFeePerGas,
          gasPrice: null,
          callGasLimit,
          verificationGasLimit,
          preVerificationGas,
        },
      });
    }
    log.info(`Gas price for chainId: ${chainId} is: ${gasPrice}`);
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: 1,
      result: {
        maxPriorityFeePerGas: null,
        maxFeePerGas: null,
        gasPrice,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
      },
    });
  } catch (error) {
    log.error(`Error in Gasless Fallback relay ${error}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: JSON.stringify(error),
    });
  }
};
