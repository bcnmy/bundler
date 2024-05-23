import { ChainStatus, StatusInfo } from "../../types";

export interface IStatusService {
  checkChain(chainId: number): Promise<ChainStatus>;
  info(): Promise<StatusInfo>;
}
