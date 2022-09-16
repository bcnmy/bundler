import { BigNumberish } from "ethers";

type PromiseOrValue<T> = T | Promise<T>;

export type GasFeePaymentArgsStruct = {
    feeTokenAddress: PromiseOrValue<string>;
    feeAmount: PromiseOrValue<BigNumberish>;
    relayer: PromiseOrValue<string>;
};

export type CCMPMessagePayload = {
    to: string;
    _calldata: string;
};

export type CCMPMessage = {
    sender: string;
    sourceGateway: string;
    sourceAdaptor: string;
    sourceChainId: BigNumberish;
    destinationGateway: string;
    destinationChainId: BigNumberish;
    nonce: BigNumberish;
    routerAdaptor: string;
    gasFeePaymentArgs: GasFeePaymentArgsStruct;
    payload: CCMPMessagePayload[];
};
