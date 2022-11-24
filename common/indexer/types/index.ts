export interface IIndexerService {
  registerWebhook(
    webhookUrl: string,
    auth: string,
    chainId: number,
    contracts: IndexerContractsRegistrationListType
  ): Promise<IndexerRegistrationResponse>;
}

export type IndexerRegistrationResponse = {};

export type IndexerEventDataType = {
  name: string;
  topicid: string;
  blockConfirmations: number;
  processTransferLogs: boolean;
};

export type IndexerContractsRegistrationListType = {
  scAddress: string;
  events: IndexerEventDataType[];
  abi: string;
}[];
