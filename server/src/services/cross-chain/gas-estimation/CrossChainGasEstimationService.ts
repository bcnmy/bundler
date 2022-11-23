import { ethers } from 'ethers';
import type { BigNumber } from 'ethers';
import { getNativeTokenSymbol } from '../../../../../common/token';
import type { IGasPrice } from '../../../../../common/gas-price';
import type { CCMPMessage, CCMPRouterName } from '../../../../../common/types';
import type { ICCMPRouterService } from '../router-service/interfaces';
import type { ICrossChainGasEstimationService } from './interfaces/ICrossChainGasEstimationService';
import type { ITokenPriceConversionService } from '../../../../../common/token/interface/ITokenPriceConversionService';
import { logger } from '../../../../../common/log-config';
import { config } from '../../../../../config';
import type { CCMPSimulationService } from '../../../../../common/simulation';

const log = logger(module);

export class CrossChainGasEstimationService implements ICrossChainGasEstimationService {
  private readonly tokenAddressToSymbolMap: Record<number, Record<string, string>>;

  constructor(
    private readonly chainId: number, // Destination Chain Id
    private readonly ccmpSimulationService: CCMPSimulationService,
    private readonly tokenPriceConversionService: ITokenPriceConversionService,
    private readonly routerServiceMap: { [key in CCMPRouterName]?: ICCMPRouterService },
    private readonly gasPriceService: IGasPrice,
    symbolToTokenAddressMap: Record<number, Record<string, string>>,
  ) {
    // Ensure all the addresses are lower case
    this.tokenAddressToSymbolMap = Object.fromEntries(
      Object.entries(symbolToTokenAddressMap).map(([_chainId, symbolToAddressMap]) => [
        _chainId,
        Object.fromEntries(
          Object.entries(symbolToAddressMap).map(([symbol, address]) => [
            address.toLowerCase(),
            symbol,
          ]),
        ),
      ]),
    );
  }

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

  private async getTxCostInFeeToken(
    chainId: number,
    gasUnits: number,
    feeTokenSymbol: string,
  ): Promise<BigNumber> {
    // Get gas price and calculate tx cost in native token
    const gasPrice = await this.gasPriceService.getGasPrice();
    let effectiveGasPrice = 0;
    if (typeof gasPrice !== 'string') {
      effectiveGasPrice = parseInt(gasPrice.maxFeePerGas, 10);
      effectiveGasPrice += parseInt(gasPrice.maxPriorityFeePerGas, 10);
    } else {
      effectiveGasPrice = parseInt(gasPrice, 10);
    }
    log.info(`Effective Gas Price: ${effectiveGasPrice}`);
    const txGasFeeInNativeToken = ethers.BigNumber.from(gasUnits).mul(effectiveGasPrice);
    log.info(`Tx Gas Fee in Native Token: ${txGasFeeInNativeToken}`);
    const nativeTokenSymbol = getNativeTokenSymbol(chainId);
    log.info(`Native Token Symbol: ${nativeTokenSymbol}`);

    // Convert Tx Cost to Fee Token
    let tokenAmount: ethers.BigNumber = txGasFeeInNativeToken;
    if (feeTokenSymbol !== nativeTokenSymbol) {
      tokenAmount = await this.tokenPriceConversionService.getEquivalentTokenAmount(
        [
          {
            amount: txGasFeeInNativeToken.toString(),
            tokenSymbol: nativeTokenSymbol,
            chainId,
          },
        ],
        chainId,
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
      parseInt(message.sourceChainId.toString(), 10),
      verificationGasFee,
      feeTokenSymbol,
    );
    log.info(`Verification Tx Gas Fee in Fee Token: ${verificationTxGasFeeInFeeToken.toString()}`);
    return verificationTxGasFeeInFeeToken;
  }

  private async getMessageVerificationFee(message: CCMPMessage, feeTokenSymbol: string) {
    const simulationResult = await this.ccmpSimulationService.simulate({ ccmpMessage: message });
    log.info(`Message Gas Fee: ${JSON.stringify(simulationResult)}`);
    if (!simulationResult.isSimulationSuccessful) {
      throw new Error(`Simulation failed: ${simulationResult.err}`);
    }
    const messageGasFeeInFeeToken = await this.getTxCostInFeeToken(
      parseInt(message.sourceChainId.toString(), 10),
      simulationResult.gasEstimateFromSimulation + simulationResult.txBaseGasEstimate,
      feeTokenSymbol,
    );
    log.info(`Message Gas Fee in Fee Token: ${messageGasFeeInFeeToken.toString()}`);
    return messageGasFeeInFeeToken;
  }

  public async estimateCrossChainFee(txHash: string, message: CCMPMessage) {
    log.info(`Estimating cross chain fee for txHash: ${txHash}, message hash: ${message.hash}`);
    try {
      if (message.destinationChainId.toString() !== this.chainId.toString()) {
        throw new Error(
          `Message Sent to Wrong Service. Expected: ${this.chainId} Received: ${message.destinationChainId}`,
        );
      }

      const fromChainid = parseInt(message.sourceChainId.toString(), 10);
      const toChainId = parseInt(message.destinationChainId.toString(), 10);

      const { feeTokenAddress } = message.gasFeePaymentArgs;
      const feeTokenSymbol = this.tokenAddressToSymbolMap[fromChainid][
        feeTokenAddress.toLowerCase()
      ];
      if (!feeTokenSymbol) {
        throw new Error(
          `Fee Token Symbol not found for address: ${feeTokenAddress} on chainid ${fromChainid}`,
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
      log.info(`Total Fee before commission: ${totalFee} $${feeTokenSymbol}`);

      let commissionPerc = config.feeOption.commission[toChainId];
      if (!commissionPerc) {
        log.error(`Commission not found for chainId: ${toChainId}`);
        commissionPerc = 0;
      }

      const commission = totalFee.mul(Math.floor(commissionPerc * 10 ** 6)).div(10 ** 8);
      const finalFee = totalFee.add(commission);
      log.info(`Comission: ${commission} $${feeTokenSymbol}, Final Fee: ${finalFee} $${feeTokenSymbol}`);

      return {
        amount: finalFee,
        tokenSymbol: feeTokenSymbol,
      };
    } catch (e) {
      log.error(`Error estimating verification fee for messge: ${message.hash}`, e);
      throw e;
    }
  }
}
