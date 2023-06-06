import { ethers } from 'ethers';
import { MempoolConfigType } from '../../types';

export type MempoolManagerParamsType = {
  options: {
    chainId: number;
    entryPoint: ethers.Contract;
    mempoolConfig: MempoolConfigType
  }
};
