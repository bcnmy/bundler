import Cryptr from 'cryptr';
import { config } from '../../config';

const cryptr = new Cryptr(config.relayerService.ETH_ACCOUNT_PASS);

export const encryptData = (data: string) => cryptr.encrypt(data);

export const decryptData = (data: string) => cryptr.encrypt(data);
