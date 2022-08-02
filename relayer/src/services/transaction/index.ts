import { ethers } from 'ethers';
import { Network } from 'network-sdk';
import { redisClient } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';
import { IRetryPolicy } from '../../common/types';
import { getNetworkRpcUrlsKey } from '../../utils/cache-utils';

const log = logger(module);

const {
  ALREADY_KNOWN,
  REPLACEMENT_UNDERPRICED,
  INSUFFICIENT_FUNDS,
} = config.relayerService.networkResponseCodes.errors;

export class Transaction implements IRetryPolicy {
  private retryCount: number;

  private networkId: number;

  private params: any;

  private network: Network;

  constructor(params: any, network: Network, public maxTries: number = 3) {
    this.retryCount = 0;
    this.networkId = params.networkId;
    this.params = params;
    this.network = network;
  }

  // eslint-disable-next-line consistent-return
  execute = async (): Promise<any> => {
    const { rawTransaction, fromAddress, privateKey } = this.params;
    let data: any;
    log.info(`executing transaction at ${Date.now()} from address ${fromAddress} on network id ${this.networkId}`);
    const networkRpcUrlsData = await redisClient.get(getNetworkRpcUrlsKey()) as string;

    const networkRpcUrls = JSON.parse(networkRpcUrlsData);
    const providers = (networkRpcUrls && networkRpcUrls[this.networkId]) || [{
      name: 'default',
      rpcUrl: this.network.networkUrl,
    }];

    for await (const provider of providers) {
      this.network.setProvider(provider.rpcUrl);
      try {
        data = await this.network.executeTransaction(
          rawTransaction,
          fromAddress,
          privateKey,
        );
        if (data) { return data; }
      } catch (error:any) {
        const tryAgain = await this.shouldRetry(error.toString());
        log.info(`status for retrying is ${tryAgain} from address ${fromAddress} on network id ${this.networkId}`);
        if (tryAgain) {
          this.incrementTry();
          log.info(`retry count is ${this.retryCount} from address ${fromAddress} on network id ${this.networkId}`);
          return await Promise.resolve(this.execute());
        }
        return {
          error: `transaction failed with error ${error.toString()} from address ${fromAddress} on network id ${this.networkId}`,
        };
      }
    }
  };

  shouldRetry = async (err: any): Promise<boolean> => {
    const errInString = err.toString();
    log.info(errInString);
    const nonceErrorMessage = config.relayerService.networksNonceError[this.networkId];
    const replacementFeeLowMessage = REPLACEMENT_UNDERPRICED;
    const alreadyKnownMessage = ALREADY_KNOWN;
    const insufficientFundsErrorMessage = config
      .relayerService.networksInsufficientFundsError[this.networkId]
    || INSUFFICIENT_FUNDS;

    if (this.retryCount >= this.maxTries) return false;

    if (errInString.indexOf(nonceErrorMessage) > -1 || errInString.indexOf('increasing the gas price or incrementing the nonce') > -1) {
      log.info(
        `Nonce too low error for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}. Removing nonce from cache and retrying`,
      );
      this.params.rawTransaction.nonce = await this.network
        .getNonce(this.params.rawTransaction.from, true);
      log.info(`updating the nonce to ${this.params.rawTransaction.nonce} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    } else if (errInString.indexOf(replacementFeeLowMessage) > -1) {
      log.info(
        `Replacement underpriced error for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`,
      );
      let { gasPrice } = await this.network.getGasPrice();

      log.info(`gas price from network ${gasPrice}`);
      const gasPriceInNumber = ethers.BigNumber.from(
        gasPrice.toString(),
      ).toNumber();

      log.info(`this.params.rawTransaction.gasPrice ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);

      if (gasPrice < this.params.rawTransaction.gasPrice) {
        gasPrice = this.params.rawTransaction.gasPrice;
      }
      log.info(`transaction sent with gas price ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
      log.info(`bump gas price ${config.bumpGasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
      log.info(`gasPriceInNumber ${gasPriceInNumber} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
      this.params.rawTransaction.gasPrice = (
        gasPriceInNumber * config.bumpGasPrice
      ) + gasPriceInNumber;
      log.info(`increasing gas price for the resubmit transaction ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}`);
    } else if (errInString.indexOf(alreadyKnownMessage) > -1) {
      log.info(
        `Already known transaction hash with same payload and nonce for relayer ${this.params.rawTransaction.from} on network id ${this.networkId}. Removing nonce from cache and retrying`,
      );
    } else if (errInString.indexOf(insufficientFundsErrorMessage) > -1) {
      log.info(`Relayer ${this.params.rawTransaction.from} has insufficient funds`);
      // Send previous relayer for funding
    } else {
      log.info('transaction not being retried');
      return false;
    }
    return true;
  };

  incrementTry() {
    this.retryCount += 1;
  }
}
