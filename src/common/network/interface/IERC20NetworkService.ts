import { BigNumber } from "ethers";

export interface IERC20NetworkService {
  getTokenBalance(
    userAddress: string,
    tokenAddress: string,
  ): Promise<BigNumber>;
  checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    value: BigNumber,
  ): Promise<boolean>;
  getDecimal(tokenAddress: string): Promise<number>;
}
