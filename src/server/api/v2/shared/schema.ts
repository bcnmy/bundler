import Joi from "joi";

import {
  eth_chainIdRequestSchema,
  eth_sendUserOperationSchema,
  eth_getUserOperationReceiptSchema,
  eth_supportedEntryPointsSchema,
  eth_getUserOperationByHashSchema,
  eth_estimateUserOperationGasSchema,
  biconomy_getUserOperationsByApiKeySchema,
  biconomy_getGasFeeValuesRequestSchema,
  biconomy_getUserOperationStatusRequestSchema,
} from "../schema";
import { BundlerMethods } from "../../methods/bundler";
import { EthMethods } from "../../methods/eth";
import { BiconomyMethods } from "../../methods/biconomy";

export const methodToSchema: Record<string, Joi.ObjectSchema> = {
  [BundlerMethods.eth_sendUserOperation]: eth_sendUserOperationSchema,
  [BundlerMethods.eth_estimateUserOperationGas]:
    eth_estimateUserOperationGasSchema,
  [BundlerMethods.eth_getUserOperationByHash]: eth_getUserOperationByHashSchema,
  [BundlerMethods.eth_getUserOperationReceipt]:
    eth_getUserOperationReceiptSchema,
  [BundlerMethods.eth_supportedEntryPoints]: eth_supportedEntryPointsSchema,
  [EthMethods.eth_chainId]: eth_chainIdRequestSchema,
  [BiconomyMethods.biconomy_getUserOperationsByApiKey]:
    biconomy_getUserOperationsByApiKeySchema,
  [BiconomyMethods.biconomy_getGasFeeValues]:
    biconomy_getGasFeeValuesRequestSchema,
  [BiconomyMethods.biconomy_getUserOperationStatus]:
    biconomy_getUserOperationStatusRequestSchema,
} as const;
