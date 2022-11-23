import { ethers } from 'ethers';
import { config } from '../../../../../config';
import type { ILiquidityPoolService } from './interfaces/ILiquidityPoolService';
import type {
  CCMPRouterName,
  CCMPMessagePayload,
  CCMPMessage,
} from '../../../../../common/types';
import { logger } from '../../../../../common/log-config';
import { ILiquidityTokenManagerService } from './interfaces/ILiquidityTokenManagerService';
import { EVMNetworkService } from '../../../../../common/network';

const log = logger(module);

export class LiquidityPoolService implements ILiquidityPoolService {
  private readonly liquidityPoolInterface = new ethers.utils.Interface(
    config.ccmp.abi.LiquidityPool,
  );

  private readonly tokenAddressToSymbolMap: Record<number, Record<string, string>>;

  constructor(
    private readonly liquidityTokenManagerService: ILiquidityTokenManagerService,
    private readonly networkServiceMap: Record<number, EVMNetworkService>,
    symbolToTokenAddressMap: Record<number, Record<string, string>>,
  ) {
    this.tokenAddressToSymbolMap = Object.fromEntries(
      Object.entries(symbolToTokenAddressMap).map(([chainId, symbolToAddressMap]) => [
        chainId,
        Object.fromEntries(
          Object.entries(symbolToAddressMap).map(([symbol, address]) => [
            // Convert addresses to lowercase
            address.toLowerCase(),
            symbol,
          ]),
        ),
      ]),
    );
  }

  async generateDepositAndCallMessage(
    fromChainId: number,
    toChainId: number,
    fromTokenAddress: string,
    receiverAddress: string,
    amountInWei: string,
    adaptorName: CCMPRouterName,
    payloads: CCMPMessagePayload[],
  ): Promise<CCMPMessage> {
    // Get Contract Addresses Required
    const fromChainLiquidityPoolAddress = config.ccmp.contracts[fromChainId].LiquidityPool;
    if (!fromChainLiquidityPoolAddress) {
      throw new Error(`Liquidity Pool Address not found for chainId: ${fromChainId}`);
    }

    const toChainLiquidityPoolAddress = config.ccmp.contracts[toChainId].LiquidityPool;
    if (!toChainLiquidityPoolAddress) {
      throw new Error(`Liquidity Pool Address not found for chainId: ${toChainId}`);
    }

    const fromChainGateway = config.ccmp.contracts[fromChainId].CCMPGateway;
    if (!fromChainGateway) {
      throw new Error(`CCMP Gateway Address not found for chainId: ${fromChainId}`);
    }

    const toChainGateway = config.ccmp.contracts[toChainId].CCMPGateway;
    if (!toChainGateway) {
      throw new Error(`CCMP Gateway Address not found for chainId: ${toChainId}`);
    }

    const fromChainAdaptor = config.ccmp.adaptors[fromChainId][adaptorName];
    if (!fromChainAdaptor) {
      throw new Error(
        `Adaptor not found for chainId: ${fromChainId} and adaptorName: ${adaptorName}`,
      );
    }

    const tokenSymbol = this.tokenAddressToSymbolMap[fromChainId][fromTokenAddress.toLowerCase()];
    if (!tokenSymbol) {
      throw new Error(
        `Token symbol not found for chainId: ${fromChainId} and tokenAddress: ${fromTokenAddress}`,
      );
    }

    const liquidityPoolTokenSymbol = await this.liquidityTokenManagerService.getTokenSymbol(
      tokenSymbol,
    );
    if (!liquidityPoolTokenSymbol) {
      throw new Error(
        `Liquidity Pool Token symbol not found for chainId: ${fromChainId} and tokenAddress: ${fromTokenAddress}`,
      );
    }

    const sourceChainDecimals = await this.networkServiceMap[fromChainId].getDecimal(
      fromTokenAddress,
    );
    if (!sourceChainDecimals) {
      throw new Error(
        `Token decimals not found for chainId: ${fromChainId} and tokenAddress: ${fromTokenAddress}`,
      );
    }

    const sendFundsToUserFromCCMPData = {
      tokenSymbol: liquidityPoolTokenSymbol,
      sourceChainAmount: amountInWei,
      sourceChainDecimals,
      receiver: receiverAddress,
      hyphenArgs: [],
    };
    const calldata = this.liquidityPoolInterface.encodeFunctionData('sendFundsToUserFromCCMP', [
      sendFundsToUserFromCCMPData,
    ]);

    const updatedPayloads = [{ to: toChainLiquidityPoolAddress, _calldata: calldata }, ...payloads];

    const ccmpMessage: CCMPMessage = {
      hash: 'NOT_GENERATED',
      sender: fromChainLiquidityPoolAddress,
      sourceGateway: fromChainGateway,
      sourceAdaptor: fromChainAdaptor,
      sourceChainId: fromChainId,
      destinationGateway: toChainGateway,
      destinationChainId: toChainId,
      nonce: ethers.BigNumber.from(2).pow(256).sub(1).toString(),
      routerAdaptor: adaptorName,
      gasFeePaymentArgs: {
        feeTokenAddress: fromTokenAddress,
        feeAmount: ethers.BigNumber.from(2).pow(10),
        relayer: '0x7306aC7A32eb690232De81a9FFB44Bb346026faB',
      },
      payload: updatedPayloads,
    };

    log.info(`Generated CCMP Message: ${JSON.stringify(ccmpMessage)}`);

    return ccmpMessage;
  }
}
