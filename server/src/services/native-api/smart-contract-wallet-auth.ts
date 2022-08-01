import { STATUSES } from '../../middleware';
import type { NativeAPI } from '.';
import { SmartContractWalletAuth, ErrorType } from './interface/native-api';

export async function smartContractWalletAuth(
  this: NativeAPI,
  to: string,
  dappId: string,
): Promise<SmartContractWalletAuth | ErrorType> {
  // check destination address is whitelisteds
  const whitelistedTarget = await this.daoUtils
    .findOneWhitelistedTargeByDappIdAndContractAddress(
      dappId,
      to,
    );
  if (!whitelistedTarget.status) {
    return {
      error: `Destination Contract ${to} is not whitelisted`,
      code: STATUSES.BAD_REQUEST,
    };
  }
  return {
    isSmartContractWalletAuthenticated: true,
  };
}
