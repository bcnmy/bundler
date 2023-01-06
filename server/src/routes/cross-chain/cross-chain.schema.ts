import Joi from 'joi';
import { CCMPRouterName } from '../../../../common/types';

const {
  string, number, object, alternatives, array,
} = Joi.types();

const address = (err: Error) => string
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .required()
  .error(err);

const keccak256Hash = (err: Error) => string
  .regex(/^0x[a-fA-F0-9]{64}$/)
  .required()
  .error(err);

const routerAdaptorType = alternatives
  .try(CCMPRouterName.AXELAR, CCMPRouterName.HYPERLANE, CCMPRouterName.WORMHOLE)
  .error(new Error('routerAdaptor is required or is invalid'));

export const getCrossChainTransactionStatusBySourceTransactionSchema = object.keys({
  txHash: keccak256Hash(new Error('txHash is required or is invalid')),
  chainId: number.required().error(new Error('chainId is required or is invalid')),
});

export const getCrossChainTransactionStatusByMessageHashSchema = object.keys({
  messageHash: keccak256Hash(new Error('Message Hash is required or is invalid')),
  chainId: number.required().error(new Error('chainId is required or is invalid')),
});

export const estimateDepositAndCallApiSchema = object.keys({
  fromChainId: number.required().error(new Error('fromChainId is required')),
  toChainId: number.required().error(new Error('toChainId is required')),
  fromTokenAddress: address(new Error('fromTokenAddress is required')),
  receiverAddress: address(new Error('receiverAddress is required')),
  amountInWei: string.required().error(new Error('amountInWei is required')),
  adaptorName: routerAdaptorType,
  payloads: array.items(
    object.keys({
      to: address(new Error('to address is required')),
      _calldata: string.required().error(new Error('calldata is required')),
    }),
  ),
});

export const processFromTxHashApiSchema = object.keys({
  txHash: keccak256Hash(new Error('txHash is required')),
  chainId: number.required().error(new Error('chainId is required')),
});

export const processFromMessageApiSchema = object.keys({
  txHash: keccak256Hash(new Error('txHash is required')),
  message: object.keys({
    sender: address(new Error('sender address is required')),
    sourceGateway: address(new Error('sourceGateway address is required')),
    sourceAdaptor: address(new Error('sourceAdapter address is required')),
    sourceChainId: number.required().error(new Error('source chainId is required')),
    destinationGateway: address(new Error('destinationChainGateway address is required')),
    destinationChainId: number.required().error(new Error('destination chainId is required')),
    nonce: string.required().error(new Error('nonce is required')),
    routerAdaptor: routerAdaptorType,
    gasFeePaymentArgs: object.keys({
      feeTokenAddress: address(new Error('feeTokenAddress is required')),
      feeAmount: string.required().error(new Error('feeTokenAmount is required')),
      relayer: address(new Error('relayer address is required')),
    }),
    payload: array.items(
      object.keys({
        to: address(new Error('to address is required')),
        _calldata: string.required().error(new Error('calldata is required')),
      }),
    ),
    hash: keccak256Hash(new Error('hash is required')),
  }),
});

export const processFromIndexerApiSchema = object.keys({
  chainId: number.required().error(new Error('chainId is required')),
  txHash: keccak256Hash(new Error('txHash is required')),
  data: object.keys({
    sender: address(new Error('sender address is required')),
    sourceGateway: address(new Error('sourceGateway address is required')),
    sourceAdaptor: address(new Error('sourceAdapter address is required')),
    sourceChainId: number.required().error(new Error('source chainId is required')),
    destinationGateway: address(new Error('destinationChainGateway address is required')),
    destinationChainId: number.required().error(new Error('destination chainId is required')),
    nonce: string.required().error(new Error('nonce is required')),
    routerAdaptor: routerAdaptorType,
    gasFeePaymentArgs: object.keys({
      FeeTokenAddress: address(new Error('feeTokenAddress is required')),
      FeeAmount: string.required().error(new Error('feeTokenAmount is required')),
      Relayer: address(new Error('relayer address is required')),
    }),
    payload: array.items(
      object.keys({
        To: address(new Error('to address is required')),
        Calldata: string.required().error(new Error('calldata is required')),
      }),
    ),
    hash: keccak256Hash(new Error('hash is required')),
  }),
});
