import {
  AbacusCore,
  MultiProvider,
  coreEnvironments,
  InterchainGasCalculator,
  ChainName,
} from '@abacus-network/sdk';
import { ethers } from 'ethers';
import { config } from '../../../../../config';
import type { ICCMPRouterService } from './interfaces';
import type { CCMPMessageType } from '../../../../../common/types';
import type { EVMNetworkService } from '../../../../../common/network';
import { logger } from '../../../../../common/log-config';
import { getNativeTokenSymbol } from '../../../../../common/token';

const log = logger(module);

export class HyperlaneRouterService implements ICCMPRouterService {
  private readonly hyperlaneSdk: AbacusCore<any>;

  private readonly environment: keyof typeof coreEnvironments;

  private readonly multiProvider: MultiProvider;

  private readonly nativeTokenSymbol: string;

  private readonly interchainGasCalculator: InterchainGasCalculator<any>;

  private readonly chainIdToName: Record<number, ChainName>;

  private readonly verificationData: string;

  constructor(
    private readonly chainId: number,
    private readonly networkService: EVMNetworkService,
  ) {
    this.environment = config.ccmp.bridges.hyperlane.environment as any;
    this.chainIdToName = config.ccmp.bridges.hyperlane.chainName;
    this.nativeTokenSymbol = getNativeTokenSymbol(this.chainId);
    if (!this.nativeTokenSymbol) {
      throw new Error(`Unable to find native token symbol for chain ${this.chainId}`);
    }

    // Initialize Hyperlane SDK
    this.multiProvider = new MultiProvider(
      // Map from Hyperlane chain name to provider
      Object.fromEntries(
        Object.entries(config.chains.provider).map(([_chainId, provider]) => [
          this.chainIdToName[parseInt(_chainId, 10)],
          { provider: new ethers.providers.JsonRpcProvider(provider) },
        ]),
      ) as any,
    );
    this.hyperlaneSdk = AbacusCore.fromEnvironment(this.environment, this.multiProvider);
    this.interchainGasCalculator = new InterchainGasCalculator(
      this.multiProvider,
      this.hyperlaneSdk,
    );

    const abiCoder = new ethers.utils.AbiCoder();
    this.verificationData = abiCoder.encode(['uint256'], [0]);
  }

  // eslint-disable-next-line class-methods-use-this
  async estimateVerificationFeePaymentTxGas(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    txHash: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    message: CCMPMessageType,
  ): Promise<number> {
    return config.ccmp.bridges.hyperlane.verificationFeePaymentTxGas;
  }

  async estimateVerificationFee(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    txHash: string,
    message: CCMPMessageType,
  ) {
    const sourceChainId = parseInt(message.sourceChainId.toString(), 10);
    const sourceChain = this.chainIdToName[sourceChainId];
    if (!sourceChain) {
      throw new Error(`Unable to find source chain for chainId ${message.sourceChainId}`);
    }
    const destinationChainId = parseInt(message.destinationChainId.toString(), 10);
    const destinationChain = this.chainIdToName[destinationChainId];
    if (!destinationChain) {
      throw new Error(`Unable to find destination chain for chainId ${message.destinationChainId}`);
    }
    log.info(
      `Estimating hyperlane verification fee for message ${message.hash} from ${sourceChain} to ${destinationChain}...`,
    );
    const nativeTokenEstimate = await this.interchainGasCalculator.estimatePaymentForHandleGas(
      sourceChain,
      destinationChain,
      ethers.BigNumber.from(config.ccmp.bridges.hyperlane.verificationGas),
    );
    log.info(
      `Hyperlane verification fee for message ${
        message.hash
      } from ${sourceChain} to ${destinationChain} is ${nativeTokenEstimate.toString()} ${
        this.nativeTokenSymbol
      }`,
    );
    return {
      amount: nativeTokenEstimate,
      tokenSymbol: this.nativeTokenSymbol,
    };
  }

  async handlePreVerification(txHash: string, message: CCMPMessageType) {
    // TODO Implement fee payment mechanism
    log.info(
      `Waiting for transaction ${txHash} with message ${message.hash} to be confirmed by Hyperlane...`,
    );
    const txReceipt = await this.networkService.getTransactionReceipt(txHash);

    try {
      const id = setInterval(() => {
        try {
          const dispatchedMessage = this.hyperlaneSdk.getDispatchedMessages(txReceipt);
          log.info(`Dispatched Message for Hyperlane Message ${message.hash}: ${JSON.stringify(dispatchedMessage)}`);
        } catch (e) {
          log.error(`Error while getting dispatched message for message ${message.hash}: ${JSON.stringify(e)}`);
        }
      }, 5000);

      // Wait for message to get processed
      const processReceipts = await this.hyperlaneSdk.waitForMessageProcessing(txReceipt);
      clearInterval(id);
      log.info(`Status for hyperlane message ${message.hash}: ${JSON.stringify(processReceipts)}`);
    } catch (e) {
      throw new Error(`Error while waiting for message ${message.hash} processing: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async getVerificationData(txHash: string, message: CCMPMessageType): Promise<string> {
    return this.verificationData;
  }
}
