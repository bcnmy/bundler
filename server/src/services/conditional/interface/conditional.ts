export type NFTMetaDataType = {
  contract: {
    address: string,
  },
  id: {
    tokenId: string,
  },
  balance: string,
};

export type AddAddressWhitelistType = {
  dappId: string,
  addresses: [],
};

type NFTConditionType = {
  type: Condition.NFT,
  params: NFTParamsType
};

type AddressWhitelistConditionType = {
  networkId: number;
  type: Condition.ADDRESS_WHITELIST,
  params: AddressWhitelistConidtionParamsType
};

type TokenLimitConditionType = {
  type: Condition.TOKEN_LIMIT,
  params: TokenLimitConditionParamsType,
  token_limit: number,
};

export type ConditionType = NFTConditionType
| TokenLimitConditionType
| AddressWhitelistConditionType;

export enum Condition {
  NFT = 'nft',
  ADDRESS_WHITELIST = 'whitelisted_address',
  TOKEN_LIMIT = 'token_limit',
}

export type ConditionResponseType = {
  success: boolean;
  msg: string;
};

export type NFTParamsType = {
  address: string;
  networkId: string;
};

export type TokenLimitConditionParamsType = {
  address: string;
  networkId: string;
};

export type AddressWhitelistConidtionParamsType = {
  addresses: string[];
};
