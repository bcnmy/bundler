import { UpdateRequestDataType } from '../../../../common/types';
import { axiosPostCall, parseError } from '../../../../common/utils';
import { config } from '../../../../config';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const updateRequest = async (
  updateRequestData: UpdateRequestDataType,
) => {
  try {
    const {
      chainId,
      dappAPIKey,
      bundlerRequestId,
      ...rest
    } = updateRequestData;
    const aaDashboardBackendBaseUrl = config.aaDashboardBackend.url;

    const response = await axiosPostCall(`${aaDashboardBackendBaseUrl}/${chainId}/${dappAPIKey}`, {
      _id: bundlerRequestId,
      rest,
    });

    log.info(`Response from AA Dashboard Backend for updating request: ${JSON.stringify(response)}`);
  } catch (error) {
    log.error(`Error in updating bundler request with error: ${parseError(error)}`);
  }
};
