import axios from 'axios';
import { logger } from '../log-config';

import type {
  IIndexerService,
  IndexerContractsRegistrationListType,
  IndexerRegistrationResponse,
} from './types';

const log = logger(module);

export class IndexerService implements IIndexerService {
  constructor(private readonly indexerBaseUrl: string) {}

  async registerWebhook(
    webhookUrl: string,
    auth: string,
    chainId: number,
    contracts: IndexerContractsRegistrationListType,
  ): Promise<IndexerRegistrationResponse> {
    log.info(
      `Registering webhooks for ${webhookUrl} on chain ${chainId} with ${contracts.length} contracts`,
    );

    const response = await axios.post(`${this.indexerBaseUrl}/registerWebhook`, {
      destination: webhookUrl,
      auth,
      chainId,
      contracts,
    });

    log.info(`Response code from indexer registerWebhook: ${response.status}`);

    return response;
  }
}
