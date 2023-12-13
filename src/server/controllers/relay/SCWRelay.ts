/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { logger } from "../../../common/logger";
import {
  routeTransactionToRelayerMap,
  transactionDao,
} from "../../../common/service-manager";
import {
  isError,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from "../../../common/types";
import { generateTransactionId, parseError } from "../../../common/utils";
import { config } from "../../../config";
import { STATUSES } from "../../middleware";

const websocketUrl = config.socketService.wssUrl;

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const relaySCWTransaction = async (req: Request, res: Response) => {
  try {
    const { to, data, gasLimit, chainId, value, walletInfo, refundInfo } =
      req.body.params[0];
    log.info(`Relaying SCW Transaction for SCW: ${to} on chainId: ${chainId}`);

    let gasLimitFromSimulation;
    if (to.toLowerCase() === "0xd34c0841a14cd53428930d4e0b76ea2406603b00") {
      gasLimitFromSimulation = req.body.params[1]
        ? `0x${(req.body.params[1] + 900000).toString(16)}`
        : `0x${(2000000).toString(16)}`;
    } else {
      gasLimitFromSimulation = req.body.params[1]
        ? `0x${(req.body.params[1] + 200000).toString(16)}`
        : `0x${(200000).toString(16)}`;
    }
    const transactionId = generateTransactionId(data);
    log.info(
      `Sending transaction to relayer with transactionId: ${transactionId} for SCW: ${to} on chainId: ${chainId}`,
    );
    if (!routeTransactionToRelayerMap[chainId][TransactionType.AA]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionMethodType.SCW} method not supported for chainId: ${chainId}`,
      });
    }

    const response = await routeTransactionToRelayerMap[chainId][
      TransactionType.SCW
    ].sendTransactionToRelayer({
      type: TransactionType.SCW,
      to,
      data,
      gasLimit: gasLimit || gasLimitFromSimulation,
      chainId,
      value,
      walletAddress: walletInfo.address.toLowerCase(),
      transactionId,
    });

    // refundTokenAddress -> address of token in which gas is paid
    // refundTokenCurrency -> USDT, USDC etc
    // refundAmount -> Amount of USDC, USDT etc
    // refundAmountInUSD -> Amount of USDC, USDT, WETH in USD

    try {
      const { gasToken } = refundInfo;

      const { refundAmount, refundAmountInUSD } = req.body.params[2];
      const refundTokenAddress = gasToken;
      let refundTokenCurrency = "";

      const tokenContractAddresses =
        config.feeOption.tokenContractAddress[chainId];
      for (const currency of Object.keys(tokenContractAddresses)) {
        if (
          refundTokenAddress.toLowerCase() ===
          tokenContractAddresses[currency].toLowerCase()
        ) {
          refundTokenCurrency = currency;
        }
      }

      transactionDao.save(chainId, {
        transactionId,
        transactionType: TransactionType.SCW,
        status: TransactionStatus.PENDING,
        chainId,
        walletAddress: walletInfo.address,
        resubmitted: false,
        refundTokenAddress,
        refundTokenCurrency,
        refundAmount,
        refundAmountInUSD,
        creationTime: Date.now(),
      });
    } catch (error) {
      log.error(
        `Error in SCW relay ${parseError(error)} while savinf refund data`,
      );
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
    log.error(`Error in SCW relay ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${parseError(error)}`,
    });
  }
};
