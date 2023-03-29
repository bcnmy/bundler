import CryptoJS from 'crypto-js';
import { logger } from '../../../../../common/log-config';
import { config } from '../../../../../config';

const log = logger(module);

export const authenticateFallbackGasTankDepositRequest = async (encryptedData: string) => {
  try {
    const { secretKey, authTimeFrameSeconds } = config.utilsModuleConfig;
    const decryptedData = CryptoJS.AES.decrypt(
      encryptedData,
      secretKey,
    ).toString(CryptoJS.enc.Utf8);

    const decryptedDataNumber = Number(decryptedData);

    const authTimeFrame = authTimeFrameSeconds * 1000;

    const currentTime = Date.now();

    if (currentTime - decryptedDataNumber > authTimeFrame) {
      log.info('Authentication expired');
      return {
        isAuthenticated: false,
        authenticationMessage: 'Authentication failed',
      };
    }

    return {
      isAuthenticated: true,
      authenticationMessage: 'Authentication successful',
    };
  } catch (error) {
    log.error(error);
    return {
      isAuthenticated: false,
      authenticationMessage: `Authentication failed with error: ${JSON.stringify(error)}`,
    };
  }
};
