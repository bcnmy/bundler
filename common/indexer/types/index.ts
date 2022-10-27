export interface IIndexerService {
  registerWebhook(
    webhookUrl: string,
    auth: string,
    chainId: number,
    contracts: IIndexerContractsRegistrationList
  ): Promise<IndexerRegistrationResponse>;
}

export type IndexerRegistrationResponse = {};

export type IIndexerEventData = {
  name: string;
  topicid: string;
  blockConfirmations: number;
  processTransferLogs: boolean;
};

export type IIndexerContractsRegistrationList = {
  scAddress: string;
  events: IIndexerEventData[];
  abi: string;
}[];
