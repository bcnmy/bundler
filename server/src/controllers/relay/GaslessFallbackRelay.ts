import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import { generateTransactionId, getMetaDataFromFallbackUserOp } from '../../../../common/utils';
import {
  isError,
  RelayerDestinationSmartContractName,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relayGaslessFallbackTransaction = async (req: Request, res: Response) => {
  try {
    const {
      to, data, gasLimit, chainId, value, walletInfo, metaData,
    } = req.body.params[0];

    const gasLimitFromSimulation = req.body.params[1] ? `0x${(req.body.params[1]).toString(16)}` : null;

    const fallbackGasTankAddress = config.fallbackGasTankData[chainId].address;
    log.info(`Relaying Gasless Fallback Transaction for Gasless Fallback: ${fallbackGasTankAddress} on chainId: ${chainId}`);

    const transactionId = generateTransactionId(data);
    log.info(`Sending transaction to relayer with transactionId: ${transactionId} for Gasless Fallback: ${to} on chainId: ${chainId}`);

    await transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.GASLESS_FALLBACK,
      status: TransactionStatus.PENDING,
      chainId,
      walletAddress: walletInfo.address,
      resubmitted: false,
      creationTime: Date.now(),
    });
    if (!routeTransactionToRelayerMap[chainId][TransactionType.AA]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionMethodType.GASLESS_FALLBACK} method not supported for chainId: ${chainId}`,
      });
    }

    const response = await routeTransactionToRelayerMap[chainId][TransactionType.GASLESS_FALLBACK]!
      .sendTransactionToRelayer({
        type: TransactionType.GASLESS_FALLBACK,
        to: fallbackGasTankAddress,
        data,
        gasLimit: gasLimit || gasLimitFromSimulation,
        chainId,
        value,
        walletAddress: walletInfo.address.toLowerCase(),
        transactionId,
        metaData,
      });

    try {
      const { dappAPIKey } = metaData;
      const {
        destinationSmartContractAddresses,
        destinationSmartContractMethods,
      } = await getMetaDataFromFallbackUserOp(to, data, chainId, dappAPIKey);
      metaData.destinationSmartContractAddresses = destinationSmartContractAddresses;
      metaData.destinationSmartContractMethods = destinationSmartContractMethods;

      await transactionDao.updateMetaDataAndRelayerDestinationContractDataByTransactionId(
        chainId,
        transactionId,
        metaData,
        fallbackGasTankAddress,
        RelayerDestinationSmartContractName.FALLBACK_GASLESS,
      );
    } catch (error) {
      log.info(`Error in getting meta data from to: ${to} and data: ${data}`);
      log.info(`Error: ${error}`);
    }

    if (isError(response)) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(STATUSES.SUCCESS).json({
      code: STATUSES.SUCCESS,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
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
