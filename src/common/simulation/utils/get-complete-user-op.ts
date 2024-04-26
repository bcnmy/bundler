/* eslint-disable no-param-reassign */
import { ConfigType } from "../../../config/interface/IConfig";
import { IGasPriceService } from "../../gas-price";
import { UserOperationType } from "../../types";

/**
 * Helper method to get complete user operation
 * @param userOp - user operation
 * @param chainId - chain id
 * @param config - config
 * @param gasPriceService - gas price service
 * @returns complete user operation
 */
export const getCompleteUserOp = async (data: {
  userOp: UserOperationType,
  chainId: number,
  config: ConfigType,
  gasPriceService: IGasPriceService,
}) => {
  const {
    userOp,
    chainId,
    config,
    gasPriceService,
  } = data;

  // for userOp completeness
  if (!userOp.paymasterAndData) {
    userOp.paymasterAndData = "0x";
  }

  // for userOp completeness
  if (!userOp.signature) {
    // signature not present, using default ECDSA
    userOp.signature =
      "0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b";
  }

  // for userOp completeness
  if (
    !userOp.maxFeePerGas ||
    userOp.maxFeePerGas === BigInt(0) ||
    (userOp.maxFeePerGas as unknown as string) === "0x" ||
    (userOp.maxFeePerGas as unknown as string) === "0"
  ) {
    // setting a non zero value as division with maxFeePerGas will happen
    userOp.maxFeePerGas = BigInt(1);
    if (
      config.optimismNetworks.includes(chainId) ||
      config.mantleNetworks.includes(chainId)
    ) {
      const gasPrice = await gasPriceService.getGasPrice();
      if (typeof gasPrice === "bigint") {
        userOp.maxFeePerGas = gasPrice;
      } else {
        const { maxFeePerGas } = gasPrice;
        userOp.maxFeePerGas = maxFeePerGas;
      }
    }
  }

  // for userOp completeness
  userOp.callGasLimit = BigInt(20000000);
  userOp.verificationGasLimit = BigInt(10000000);
  userOp.preVerificationGas = BigInt(100000);

  // for userOp completeness
  if (
    !userOp.maxPriorityFeePerGas ||
    userOp.maxPriorityFeePerGas === BigInt(0) ||
    (userOp.maxPriorityFeePerGas as unknown as string) === "0x" ||
    (userOp.maxPriorityFeePerGas as unknown as string) === "0"
  ) {
    // setting a non zero value as division with maxPriorityFeePerGas will happen
    userOp.maxPriorityFeePerGas = BigInt(1);
    if (
      config.optimismNetworks.includes(chainId) ||
      config.mantleNetworks.includes(chainId)
    ) {
      const gasPrice = await gasPriceService.getGasPrice();
      if (typeof gasPrice === "bigint") {
        userOp.maxPriorityFeePerGas = gasPrice;
      } else {
        const { maxPriorityFeePerGas } = gasPrice;
        userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;
      }
    }
  }
  return userOp;
};
