import { ethers } from 'ethers';
import { MempoolConfigType } from '../../types';
import { ICacheService } from '../../cache';

export type MempoolManagerParamsType = {
  cacheService: ICacheService
  options: {
    mempoolFromCache?: string,
    chainId: number;
    entryPoint: ethers.Contract;
    mempoolConfig: MempoolConfigType
  }
};
