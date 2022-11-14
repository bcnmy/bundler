import { ethers } from 'ethers';
import type { BigNumber } from 'ethers';
import type { IGasPrice } from '../../common/gas-price';
import type { CCMPMessage, CCMPRouterName } from '../../common/types';
import type { ICCMPRouterService } from '../router-service/interfaces';
import type { ICrossChainGasEstimationService } from './interfaces/ICrossChainGasEstimationService';
import type { ISDKBackendService } from '../../common/sdk-backend-service/types';
import type { ITokenPriceConversionService } from '../../common/token-price/interface/ITokenPriceConversionService';
import { logger } from '../../common/log-config';

const log = logger(module);

export class CrossChainGasEstimationService implements ICrossChainGasEstimationService {
  constructor(
    private readonly chainId: number,
    private readonly sdkBackendService: ISDKBackendService,
    private readonly tokenPriceConversionService: ITokenPriceConversionService,
    private readonly routerServiceMap: { [key in CCMPRouterName]?: ICCMPRouterService },
    private readonly gasPriceService: IGasPrice,
    private readonly tokenAddressToSymbolMap: Record<string, string>,
  ) {}

  private async getVerificationFee(
    txHash: string,
    message: CCMPMessage,
    routerService: ICCMPRouterService,
    feeTokenSymbol: string,
  ): Promise<BigNumber> {
    // Get Verification Fee
    const { amount, tokenSymbol } = await routerService.estimateVerificationFee(txHash, message);
    log.info(`Verification Fee: ${amount} $${tokenSymbol}`);

    let tokenAmount: ethers.BigNumber = ethers.BigNumber.from(amount);
    if (tokenSymbol !== feeTokenSymbol) {
      // Convert Verification Fee to Fee Token
      tokenAmount = await this.tokenPriceConversionService.getEquivalentTokenAmount(
        [
          {
            amount,
            tokenSymbol,
            chainId: this.chainId,
          },
        ],
        this.chainId,
        feeTokenSymbol,
      );
    }
    log.info(`Verification Fee in Fee Token: ${tokenAmount} $${feeTokenSymbol}`);
    return tokenAmount;
  }

  private async getTxCostInFeeToken(gasUnits: number, feeTokenSymbol: string): Promise<BigNumber> {
    // Get gas price and calculate tx cost in native token
    const gasPrice = await this.gasPriceService.getGasPrice();
    let effectiveGasPrice = 0;
    if (typeof gasPrice !== 'string') {
      effectiveGasPrice = parseInt(gasPrice.maxFeePerGas, 10) + parseInt(gasPrice.maxPriorityFeePerGas, 10);
    } else {
      effectiveGasPrice = parseInt(gasPrice, 10);
    }
    log.info(`Effective Gas Price: ${effectiveGasPrice}`);
    const txGasFeeInNativeToken = ethers.BigNumber.from(gasUnits).mul(effectiveGasPrice);
    log.info(`Tx Gas Fee in Native Token: ${txGasFeeInNativeToken}`);
    const nativeTokenSymbol = this.tokenPriceConversionService.getNativeTokenSymbol(this.chainId);
    log.info(`Native Token Symbol: ${nativeTokenSymbol}`);

    // Convert Tx Cost to Fee Token
    let tokenAmount: ethers.BigNumber = txGasFeeInNativeToken;
    if (feeTokenSymbol !== nativeTokenSymbol) {
      tokenAmount = await this.tokenPriceConversionService.getEquivalentTokenAmount(
        [
          {
            amount: txGasFeeInNativeToken.toString(),
            tokenSymbol: nativeTokenSymbol,
            chainId: this.chainId,
          },
        ],
        this.chainId,
        feeTokenSymbol,
      );
    }
    return tokenAmount;
  }

  private async getVerificationTxGasFee(
    txHash: string,
    message: CCMPMessage,
    routerService: ICCMPRouterService,
    feeTokenSymbol: string,
  ) {
    const verificationGasFee = await routerService.estimateVerificationFeePaymentTxGas(
      txHash,
      message,
    );
    log.info(`Verification Gas Fee: ${verificationGasFee}`);
    const verificationTxGasFeeInFeeToken = await this.getTxCostInFeeToken(
      verificationGasFee,
      feeTokenSymbol,
    );
    log.info(`Verification Tx Gas Fee in Fee Token: ${verificationTxGasFeeInFeeToken}`);
    return verificationTxGasFeeInFeeToken;
  }

  private async getMessageVerificationFee(message: CCMPMessage, feeTokenSymbol: string) {
    const messageGasFee = await this.sdkBackendService.estimateCrossChainMessageGas(message);
    log.info(`Message Gas Fee: ${messageGasFee}`);
    const messageGasFeeInFeeToken = await this.getTxCostInFeeToken(
      messageGasFee.gas + messageGasFee.txBaseGas,
      feeTokenSymbol,
    );
    log.info(`Message Gas Fee in Fee Token: ${messageGasFeeInFeeToken}`);
    return messageGasFeeInFeeToken;
  }

  public async estimateCrossChainFee(txHash: string, message: CCMPMessage) {
    log.info(
      `Estimating cross chain fee for txHash: ${txHash}, message: ${JSON.stringify(message)}`,
    );
    try {
      if (message.destinationChainId.toString() !== this.chainId.toString()) {
        throw new Error(
          `Message Sent to Wrong Service. Expected: ${this.chainId} Received: ${message.destinationChainId}`,
        );
      }

      const feeTokenSymbol = this.tokenAddressToSymbolMap[message.gasFeePaymentArgs.feeTokenAddress];
      if (!feeTokenSymbol) {
        throw new Error(
          `Fee Token Symbol not found for address: ${message.gasFeePaymentArgs.feeTokenAddress}`,
        );
      }

      const routerService = this.routerServiceMap[message.routerAdaptor];
      if (!routerService) {
        throw new Error(`Router ${message.routerAdaptor} not supported`);
      }

      const verificationFee = await this.getVerificationFee(
        txHash,
        message,
        routerService,
        feeTokenSymbol,
      );

      const verificationTxGasFee = await this.getVerificationTxGasFee(
        txHash,
        message,
        routerService,
        feeTokenSymbol,
      );

      const messageVerificationFee = await this.getMessageVerificationFee(message, feeTokenSymbol);

      const totalFee = verificationFee.add(verificationTxGasFee).add(messageVerificationFee);
      log.info(`Total Fee: ${totalFee} $${feeTokenSymbol}`);
      return {
        amount: totalFee,
        tokenSymbol: feeTokenSymbol,
      };
    } catch (e) {
      log.error(`Error estimating verification fee for messge: ${message.hash}`, e);
      throw e;
    }
  }
}
