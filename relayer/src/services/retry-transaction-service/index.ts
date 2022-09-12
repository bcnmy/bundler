export class RetryTransactionManager implements IRetryTransactionManager {
      async sendRetryTransaction(relayer: IRelayer, rawTransactionData: ITransactionData) {
    // bump up gas price
    // nonce update
    // call sendTransaction
    // save new db data
  }

    shouldRetryTransaction = async (err: string): Promise<boolean> => {
    const nonceErrorMessage = config.relayerService.networksNonceError[this.chainId];
    const replacementFeeLowMessage = REPLACEMENT_UNDERPRICED;
    const alreadyKnownMessage = ALREADY_KNOWN;
    const insufficientFundsErrorMessage = config
      .relayerService.networksInsufficientFundsError[this.chainId]
        || INSUFFICIENT_FUNDS;

    if (this.retryCount >= this.maxTries) return false;

    if (err.indexOf(nonceErrorMessage) > -1 || err.indexOf('increasing the gas price or incrementing the nonce') > -1) {
      log.info(
        `Nonce too low error for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}. Removing nonce from cache and retrying`,
      );
      this.params.rawTransaction.nonce = await this.network
        .getNonce(this.params.rawTransaction.from, true);
      log.info(`updating the nonce to ${this.params.rawTransaction.nonce} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
    } else if (err.indexOf(replacementFeeLowMessage) > -1) {
      log.info(
        `Replacement underpriced error for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`,
      );
      let { gasPrice } = await this.network.getGasPrice();

      log.info(`gas price from network ${gasPrice}`);
      const gasPriceInNumber = ethers.BigNumber.from(
        gasPrice.toString(),
      ).toNumber();

      log.info(`this.params.rawTransaction.gasPrice ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);

      if (gasPrice < this.params.rawTransaction.gasPrice) {
        gasPrice = this.params.rawTransaction.gasPrice;
      }
      log.info(`transaction sent with gas price ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
      log.info(`bump gas price ${config.bumpGasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
      log.info(`gasPriceInNumber ${gasPriceInNumber} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
      this.params.rawTransaction.gasPrice = (
        gasPriceInNumber * config.bumpGasPrice
      ) + gasPriceInNumber;
      log.info(`increasing gas price for the resubmit transaction ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
    } else if (errInString.indexOf(alreadyKnownMessage) > -1) {
      log.info(
        `Already known transaction hash with same payload and nonce for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}. Removing nonce from cache and retrying`,
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

  static async removeRetry(transactionId: string) {
    await redisClient.del(getTransactionDataKey(transactionId));
    await redisClient.del(getTransactionKey(transactionId));
  }

  async retryFailedTransaction() {
    log.info(`Error while executing transaction on transactionId: ${transactionId} by relayer: ${relayerAddress} on chainId: ${this.chainId}`);
    log.info(error);
    const shouldTransactionBeRetired = await this.shouldRetryTransaction(error.toString());
    log.info(`Status for retrying is ${shouldTransactionBeRetired} by relayer ${relayerAddress} on chainId ${this.chainId}`);
    if (shouldTransactionBeRetired) {
      // TODO
      // Relayer retry count logic review
      this.incrementTry();
      log.info(`retry count is ${this.retryCount} from address ${relayerAddress} on network id ${this.chainId}`);
      return await Promise.resolve(this.executeTransaction(executeParams));
    }
    return {
      error: `transaction failed with error ${error.toString()} from address ${relayerAddress} on network id ${this.chainId}`,
    };
  }
}