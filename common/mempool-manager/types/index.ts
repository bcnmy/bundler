import { ethers } from 'ethers';
import { MempoolConfigType } from '../../types';

export type MempoolManagerParamsType = {
  options: {
    chainId: number;
    entryPoint: {
      address: string,
      contract: ethers.Contract
    }
    mempoolConfig: MempoolConfigType
  }
};
