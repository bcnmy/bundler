export const getDappByApiKey = (apiKey: string): string => `DAppByAPIKey_${apiKey}`;

export const getMethodAPIKey = (apiId: string) => `ContractMethodAPI_${apiId}`;

export const getDappConfigKey = (dappId: string) => `DAppConfig_${dappId}`;

export const getGasManagerEnableFlagKey = () => 'isGasManagerEnabled';

export const getSmartContractKey = (contractId: string) => `DAppContract_${contractId}`;

export const getForwarderDefaultDomainDataKey = (forwarder:string, networkId:string) => `domainData_${forwarder}_${networkId}`;

export const getGasPriceKey = (networkId:string, gasType:string) => `GasPrice_${networkId}_${gasType}`;

export const getDappByDappIdKey = (dappId: string) => `Dapp_${dappId}`;

export const getDappByApiIdKey = (apiId: string) => `ApiId_${apiId}`;

export const getSmartContractListKey = (dappId: string): string => `SmartContractList_${dappId}`;

export const getMetaApiListPerDappKey = (dappId: string): string => `MetaApiListPerDapp_${dappId}`;

export const getMetaEntryServiceConfiguration = (): string => 'META_ENTRY_CONFIGURATION';

export const getUserDappDataByDappId = (dappId: string): string => `UserDappDataPerDapp_${dappId}`;
