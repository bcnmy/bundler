import { hostname } from 'os';

export const getRelayerServiceConfiguration = () => 'RELAYER_CONFIGURATION';

export const getTransactionKey = (txId: string) => `TxId_${txId}_${hostname()}`;

export const getTransactionDataKey = (txId: string) => `TxId_${txId}_${hostname()}_data`;

export const getNetworkRpcUrlsKey = () => 'NETWORK_RPC_URLS';

export const getGasPriceKey = (networkId:number, gasType:string = 'default') => `GasPrice_${networkId}_${gasType}`;

export const getMaxFeePerGasKey = (networkId: number, gasType: string) => `MaxFeePerGas_${networkId}_${gasType}`;

export const getBaseFeePerGasKey = (networkId: number) => `BaseFeePerGas_${networkId}`;

export const getMaxPriorityFeePerGasKey = (networkId: number, gasType: string) => `MaxPriorityFeePerGas_${networkId}_${gasType}`;

export const getNetworkFiatPricingKey = () => 'COINS_PRICES_IN_USD';
