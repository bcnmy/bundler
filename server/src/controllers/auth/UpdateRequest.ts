import { UpdateRequestDataType } from '../../../../common/types';
import { axiosPatchCall, parseError } from '../../../../common/utils';
import { config } from '../../../../config';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const updateRequest = async (
  updateRequestData: UpdateRequestDataType,
) => {
  try {
    const {
      chainId,
      apiKey,
      bundlerRequestId,
      rawResponse,
      httpResponseCode,
      transactionId,
    } = updateRequestData;
    const aaDashboardBackendBaseUrl = config.aaDashboardBackend.url;

    const response = await axiosPatchCall(`${aaDashboardBackendBaseUrl}/${chainId}/${apiKey}`, {
      _id: bundlerRequestId,
      rawResponse,
      transactionId,
      httpResponseCode,
    });

    log.info(`Response from AA Dashboard Backend for updating request: ${JSON.stringify(response)}`);
  } catch (error) {
    log.error(`Error in updating bundler request with error: ${parseError(error)}`);
  }
};
