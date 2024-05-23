import { ChainStatus } from "../../types";

export interface IStatusService {
  checkChain(chainId: number): Promise<ChainStatus>;
}
