import { AbacusCore, MultiProvider, coreEnvironments } from '@abacus-network/sdk';
import { BigNumberish, ethers } from 'ethers';
import { config } from '../../config';
import type { ICCMPRouterService } from './interfaces';
import type { CCMPMessage } from '../../common/types';
import type { EVMNetworkService } from '../../common/network';
import { logger } from '../../common/log-config';

const log = logger(module);

export class HyperlaneRouterService implements ICCMPRouterService {
  // TODO: Fix Generic
  private readonly hyperlaneSdk: AbacusCore<any>;

  private readonly environment: keyof typeof coreEnvironments;

  private readonly multiProvider: MultiProvider;

  constructor(
    private readonly chainId: number,
    private readonly networkService: EVMNetworkService,
  ) {
    this.environment = config.ccmp.bridges.hyperlane.environment as any;
    const chainIdToName = config.ccmp.bridges.hyperlane.chainName;
    this.multiProvider = new MultiProvider(
      Object.fromEntries(
        Object.entries(config.chains.provider).map(([_chainId, provider]) => [
          chainIdToName[parseInt(_chainId, 10)],
          { provider: new ethers.providers.JsonRpcProvider(provider) },
        ]),
      ) as any,
    );
    this.hyperlaneSdk = AbacusCore.fromEnvironment(this.environment, this.multiProvider);
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  async estimateVerificationFeePaymentTxGas(txHash: string, message: CCMPMessage): Promise<number> {
    // TODO: Implement
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  estimateVerificationFee(
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    txHash: string,
    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    message: CCMPMessage,
  ): Promise<any> {
    // TODO: Implement
    throw new Error('Method not implemented.');
  }

  async handlePreVerification(txHash: string, message: CCMPMessage): Promise<void> {
    // TODO: Implement fee payment mechanism
    log.info(
      `Waiting for transaction ${txHash} with message ${message.hash} to be confirmed by Hyperlane...`,
    );
    const txReceipt = await this.networkService.getTransactionReceipt(txHash);

    try {
      const processReceipts = await this.hyperlaneSdk.waitForMessageProcessing(txReceipt);
      log.info(`Status for hyperlane message ${message.hash}: ${JSON.stringify(processReceipts)}`);
    } catch (e) {
      throw new Error(`Error while waiting for message ${message.hash} processing: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async getVerificationData(txHash: string, message: CCMPMessage): Promise<string> {
    return '';
  }
}
