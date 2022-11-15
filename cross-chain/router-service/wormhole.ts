import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import {
  getSignedVAA,
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  ChainId,
} from '@certusone/wormhole-sdk';
import { config } from '../../config';
import { logger } from '../../common/log-config';
import { getNativeTokenSymbol } from '../../common/token';
import type { ICCMPRouterService } from './interfaces';
import type { CCMPMessage } from '../../common/types';
import type { EVMNetworkService } from '../../common/network';

const log = logger(module);

export class WormholeRouterService implements ICCMPRouterService {
  private readonly rpcUrl: string;

  private readonly emitterAddress: string;

  private readonly womrholeBridgeAddress: string;

  private readonly emitterChain: string;

  private readonly pollingIntervalMs: number;

  private readonly maxPollingCount: number;

  constructor(
    private readonly chainId: number,
    private readonly networkService: EVMNetworkService,
  ) {
    this.rpcUrl = config.ccmp.bridges.wormhole.hostUrl;
    this.womrholeBridgeAddress = config.ccmp.bridges.wormhole.bridgeAddress[chainId];
    this.emitterAddress = getEmitterAddressEth(config.ccmp.contracts[chainId].WormholeAdaptor);
    this.emitterChain = config.ccmp.bridges.wormhole.chainId[chainId];
    this.pollingIntervalMs = config.ccmp.bridges.wormhole.pollingIntervalMs;
    this.maxPollingCount = config.ccmp.bridges.wormhole.maxPollingCount;
    this.validate();
  }

  validate() {
    if (!this.rpcUrl) {
      throw new Error('Missing rpcUrl for wormhole bridge');
    }
    if (!this.womrholeBridgeAddress) {
      throw new Error('Missing womrholeBridgeAddress for wormhole bridge');
    }
    if (!this.emitterAddress) {
      throw new Error('Missing emitterAddress for wormhole bridge');
    }
    if (!this.emitterChain) {
      throw new Error('Missing emitterChain for wormhole bridge');
    }
    if (!this.pollingIntervalMs) {
      throw new Error('Missing pollingIntervalMs for wormhole bridge');
    }
    if (!this.maxPollingCount) {
      throw new Error('Missing maxPollingCount for wormhole bridge');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async estimateVerificationFeePaymentTxGas(txHash: string, message: CCMPMessage): Promise<number> {
    // No need to do anything here, wormhole messages are free :P
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async handlePreVerification(txHash: string, message: CCMPMessage): Promise<void> {
    // No need to do anything here, wormhole messages are free :P
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  async estimateVerificationFee(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    txHash: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    message: CCMPMessage,
  ) {
    return {
      amount: '0',
      tokenSymbol: getNativeTokenSymbol(this.chainId),
    };
  }

  async getVerificationData(txHash: string, message: CCMPMessage): Promise<Uint8Array> {
    const receipt = await this.networkService.getTransactionReceipt(txHash);
    const sequence = parseSequenceFromLogEth(receipt, this.womrholeBridgeAddress);
    log.info(`Found wormhole sequence ${sequence} for message hash ${message.hash}`);

    return new Promise<Uint8Array>((resolve, reject) => {
      let counter = 0;
      const id = setInterval(async () => {
        try {
          counter += 1;
          log.info(
            `Polling for wormhole VAA for message hash ${message.hash} with sequence ${sequence} on chain ${this.emitterChain}`,
          );
          const { vaaBytes } = await getSignedVAA(
            this.rpcUrl,
            this.emitterChain as unknown as ChainId,
            this.emitterAddress,
            sequence,
            {
              transport: NodeHttpTransport(),
            },
          );
          clearInterval(id);
          resolve(vaaBytes);
        } catch (e) {
          log.error(`Failed to get VAA for sequence ${sequence}, retrying...`);
          if (counter >= this.maxPollingCount) {
            clearInterval(id);
            reject(
              new Error(
                `Max Polling count exceeded for message hash ${message.hash}, last error: ${e}`,
              ),
            );
          }
        }
      }, this.pollingIntervalMs);
    });
  }
}
