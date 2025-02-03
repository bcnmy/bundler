import Joi from "joi";

const { number, object, string, alternatives, array } = Joi.types();

// eth_sendUserOperation
const userOpForSendUserOp = object.keys({
  sender: string
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .error(new Error("sender address is required")),
  nonce: string
    .required()
    .error(new Error("nonce is required and should be a string")),
  initCode: string,
  callData: string
    .required()
    .error(new Error("callData is required and should be a string")),
  callGasLimit: string
    .required()
    .error(new Error("callGasLimit is required and should be a string")),
  verificationGasLimit: string
    .required()
    .error(
      new Error("verificationGasLimit is required and should be a string"),
    ),
  preVerificationGas: string
    .required()
    .error(new Error("preVerificationGas is required and should be a string")),
  maxFeePerGas: string
    .required()
    .error(new Error("maxFeePerGas is required and should be a number")),
  maxPriorityFeePerGas: string
    .required()
    .error(
      new Error("maxPriorityFeePerGas is required and should be a string"),
    ),
  paymasterAndData: string,
  signature: string.required().error(new Error("signature is required")),
});

const entryPointAddress = string
  .required()
  .error(new Error("entryPointAddress is required"));

const simulationTypeObj = object.keys({
  simulation_type: string.valid("validation", "validation_and_execution"),
});

export const eth_sendUserOperationSchema = object.keys({
  method: string.regex(/eth_sendUserOperation/),
  params: array.items(
    alternatives.try(userOpForSendUserOp, entryPointAddress, simulationTypeObj),
  ),
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

// eth_estimateUserOperationGas
/**
 * Parameters: same as eth_sendUserOperation gas limits (and prices) parameters are optional,
 * but are used if specified.
 * maxFeePerGas and maxPriorityFeePerGas default to zero,
 *  so no payment is required by neither account nor paymaster.
 */
const userOpEstimateUserOpGas = object.keys({
  sender: string
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .error(new Error("sender address is required")),
  nonce: string
    .required()
    .error(new Error("nonce is required and should be a string")),
  initCode: string
    .required()
    .error(
      new Error(
        "initCode is required and should be a hex string. Send 0x if not applicable",
      ),
    ),
  callData: string
    .required()
    .error(new Error("callData is required and should be a hex string")),
  callGasLimit: string,
  verificationGasLimit: string,
  preVerificationGas: string,
  maxFeePerGas: string,
  maxPriorityFeePerGas: string,
  paymasterAndData: string,
  signature: string,
});

const stateOverrideSet = object.pattern(
  string,
  object.keys({
    balance: string,
    nonce: string,
    code: string,
    state: object,
    stateDiff: object,
  }),
);

export const eth_estimateUserOperationGasSchema = object.keys({
  method: string.regex(/eth_estimateUserOperationGas/),
  params: array.items(
    alternatives.try(
      userOpEstimateUserOpGas,
      entryPointAddress,
      stateOverrideSet,
    ),
  ),
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

// eth_getUserOperationByHash
const userOpHash = string.required().error(new Error("userOpHash is required"));

export const eth_getUserOperationByHashSchema = object.keys({
  method: string.regex(/eth_getUserOperationByHash/),
  params: array.items(alternatives.try(userOpHash)),
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

export const eth_getUserOperationReceiptSchema = object.keys({
  method: string.regex(/eth_getUserOperationReceipt/),
  params: array.items(alternatives.try(userOpHash)),
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

export const biconomy_getUserOperationStatusRequestSchema = object.keys({
  method: string.regex(/biconomy_getUserOperationStatus/),
  params: array.items(alternatives.try(userOpHash)),
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

export const eth_supportedEntryPointsSchema = object.keys({
  method: string.regex(/eth_supportedEntryPoints/),
  params: array,
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

export const eth_chainIdRequestSchema = object.keys({
  method: string.regex(/eth_chainId/),
  params: array,
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

export const biconomy_getGasFeeValuesRequestSchema = object.keys({
  method: string.regex(/biconomy_getGasFeeValues/),
  params: array,
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});

const getUserOperationsByApiKeyBody = object.keys({
  startTime: string,
  endTime: string,
  limit: number,
  offset: number,
});

export const biconomy_getUserOperationsByApiKeySchema = object.keys({
  method: string.regex(/eth_getUserOperationsByApiKey/),
  params: array.items(alternatives.try(getUserOperationsByApiKeyBody)),
  jsonrpc: string.required().error(new Error("jsonrpc is required")),
  id: number.required().error(new Error("id is required")),
});
