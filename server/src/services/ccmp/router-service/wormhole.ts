import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import {
  getSignedVAA,
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  ChainId,
} from '@certusone/wormhole-sdk';
import { config } from '../../../../../config';
import { logger } from '../../../../../common/log-config';
import type { ICCMPRouterService } from '../types';
import type { CCMPMessage } from '../../../../../common/types';
import type { EVMNetworkService } from '../../../../../common/network';

const log = logger(module);

export class WormholeRouterService implements ICCMPRouterService {
  private readonly rpcUrl: string;

  private readonly emitterAddress: string;

  private readonly emitterChain: string;

  private readonly pollingIntervalMs: number;

  private readonly maxPollingCount: number;

  constructor(
    private readonly chainId: number,
    private readonly networkService: EVMNetworkService
  ) {
    this.rpcUrl = config.ccmp.bridges.wormole.hostUrl;
    this.emitterAddress = getEmitterAddressEth(config.ccmp.bridges.wormole.bridgeAddress[chainId]);
    this.emitterChain = config.ccmp.bridges.wormole.chainId[chainId];
    this.pollingIntervalMs = config.ccmp.bridges.wormole.pollingIntervalMs;
    this.maxPollingCount = config.ccmp.bridges.wormole.maxPollingCount;
    this.validate();
  }

  validate() {
    if (!this.rpcUrl) {
      throw new Error('Missing rpcUrl for wormhole bridge');
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
  async handlePreVerification(txhHash: string, message: CCMPMessage): Promise<void> {
    // No need to do anything here, wormhole messages are fee :P
  }

  async getVerificationData(txHash: string, message: CCMPMessage): Promise<Uint8Array> {
    const receipt = await this.networkService.getTransactionReceipt(txHash);
    const sequence = parseSequenceFromLogEth(receipt, this.emitterAddress);

    return new Promise<Uint8Array>((resolve, reject) => {
      let counter = 0;
      const id = setInterval(async () => {
        try {
          counter += 1;
          log.info(
            `Polling for wormhole VAA for message hash ${message.hash} with sequence ${sequence} on chain ${this.emitterChain}`
          );
          const { vaaBytes } = await getSignedVAA(
            this.rpcUrl,
            this.emitterChain as unknown as ChainId,
            this.emitterAddress,
            sequence,
            {
              transport: NodeHttpTransport(),
            }
          );
          clearInterval(id);
          resolve(vaaBytes);
        } catch (e) {
          log.error(`Failed to get VAA for sequence ${sequence}, retrying...`);
          if (counter >= this.maxPollingCount) {
            clearInterval(id);
            reject(
              new Error(
                `Max Polling count exceeded for message hash ${message.hash}, last error: ${e}`
              )
            );
          }
        }
      }, this.pollingIntervalMs);
    });
  }
}
