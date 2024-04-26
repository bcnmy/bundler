/* eslint-disable no-param-reassign */
import { ConfigType } from "../../../config/interface/IConfig";
import { BLOCKCHAINS } from "../../types";

/**
 * Method to readjust gas limits based on network edge cases
 * @param callGasLimit - call gas limit
 * @param verificationGasLimit - verification gas limit
 * @param preVerificationGas - pre verification gas
 * @param chainId - chain id
 * @param config - config
 * @returns readjusted gas limits
 */
export const readjustGasLimits = async (data: {
  callGasLimit: bigint,
  verificationGasLimit: bigint,
  preVerificationGas: bigint,
  chainId: number,
  config: ConfigType,
}) => {
  let {
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
  } = data;

  const {
    chainId,
    config
  } = data;

  if (
    config.networksNotSupportingEthCallStateOverrides.includes(chainId) ||
    config.networksNotSupportingEthCallBytecodeStateOverrides.includes(
      chainId,
    )
  ) {
    callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.2));
    verificationGasLimit += BigInt(
      Math.ceil(Number(verificationGasLimit) * 0.2),
    );
    if (
      chainId === BLOCKCHAINS.CHILIZ_MAINNET ||
      chainId === BLOCKCHAINS.CHILIZ_TESTNET
    ) {
      verificationGasLimit += BigInt(
        Math.ceil(Number(verificationGasLimit) * 0.2),
      );
    }
  } else {
    callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.1));
    verificationGasLimit += BigInt(
      Math.ceil(Number(verificationGasLimit) * 0.1),
    );
  }

  if (chainId === BLOCKCHAINS.BLAST_MAINNET) {
    callGasLimit += BigInt(Math.ceil(Number(callGasLimit) * 0.5));
  }

  if (chainId === BLOCKCHAINS.MANTLE_MAINNET) {
    preVerificationGas += preVerificationGas;
  }

  return {
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
  };
};