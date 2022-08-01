// eslint-disable-next-line import/no-cycle
import { logger } from '../../../log-config';
import { IDaoUtils } from '../../dao-utils/interface/dao-utils';
import { BalanceOfABI } from '../../utils/abis';
import { getNFTs, parseError, stringify } from '../../utils/util';
import { getNetwork } from '../blockchain/network-manager';
import {
  AddressWhitelistConidtionParamsType,
  Condition,
  ConditionResponseType,
  ConditionType,
  NFTParamsType,
  NFTMetaDataType,
  TokenLimitConditionParamsType,
} from './interface/conditional';

const log = logger(module);

export class ConditionCheck {
  daoUtils: IDaoUtils;

  fromAddress: string;

  conditions: any = [];

  nfts: any = [];

  constructor(daoUtils: IDaoUtils, fromAddress: string) {
    this.daoUtils = daoUtils;
    this.fromAddress = fromAddress;
    this.conditions = [
      [
        {
          type: Condition.NFT,
          params: {
            address: '',
          },
        },
      ],
    ];
  }

  // 1. Find if there are any conditions to be applied
  async exists(apiId: string) {
    const data = await this.daoUtils.findOneConditionalLimitByApiId(apiId);
    if (data && data.conditions && data.conditions.length) {
      this.conditions = data.conditions;
      return true;
    }
    return false;
  }

  // 2. Parse the condition and call the method based on the condition type
  async isValid() {
    const promises = [];
    for (const condition of this.conditions) {
      promises.push(condition.map((c: ConditionType) => {
        let promise;
        switch (c.type) {
          case Condition.NFT:
            promise = this.checkNFT(c.params);
            break;
          case Condition.ADDRESS_WHITELIST:
            promise = this.checkAddressWhitelist(c.params);
            break;
          case Condition.TOKEN_LIMIT:
            promise = this.checkTokenLimit(c.params, c.token_limit);
            break;
          default:
            promise = null;
            break;
        }
        return promise;
      }));
    }

    const response = await Promise.all(promises.map(Promise.all, Promise));
    let status = false;
    const msgs: Array<String> = [];
    response.flat().forEach((r: any) => {
      if (r.success) {
        status = true;
      }
      msgs.push(r.msg);
    });
    return {
      status,
      message: 'conditional check response',
      result: msgs.join(','),
    };
  }

  async checkNFT(
    params: NFTParamsType,
  ): Promise<ConditionResponseType> {
    const { networkId: networkIdInString, address } = params;
    const networkId = parseInt(networkIdInString, 10);
    let hasNFT = false;
    if (!this.nfts.length) {
      const nfts = await getNFTs(networkId, this.fromAddress);
      this.nfts = nfts;
    }

    this.nfts.forEach((nft: NFTMetaDataType) => {
      if (nft.contract.address.toLowerCase() === address.toLowerCase()) { hasNFT = true; }
    });

    const msg = hasNFT ? 'nft exists' : `user does not have the nft with contract address ${address}`;
    return {
      success: hasNFT,
      msg,
    };
  }

  async checkTokenLimit(params: TokenLimitConditionParamsType, minimumBalance: number) {
    try {
      const { networkId: networkIdInString, address: contractAddress } = params;
      const networkId = parseInt(networkIdInString, 10);
      const contract = getNetwork(networkId)
        ?.getContract(stringify(BalanceOfABI), contractAddress);
      const decimals = await contract?.decimals();
      const balanceC = await contract
        ?.balanceOf(this.fromAddress) || 0;
      const balance = balanceC / (10 ** decimals);
      return {
        success: balance > minimumBalance,
        msg: balance > minimumBalance ? 'balance above limit' : `balance under limit of ${minimumBalance}`,
      };
    } catch (error) {
      log.error(parseError(error));
      return {
        sucess: false,
        msg: 'error',
      };
    }
  }

  async checkAddressWhitelist(params: AddressWhitelistConidtionParamsType):
  Promise<ConditionResponseType> {
    const { addresses } = params;
    const success = addresses.includes(this.fromAddress);
    const msg = success ? 'address is whitelisted' : 'address is not whitelisted';
    return {
      success,
      msg,
    };
  }
}
