import { TransactionType } from '../../common/types';
import { Consumer } from './consumer';

export class SCWConsumer extends Consumer {
  constructor(chainId: number) {
    super(chainId, TransactionType.SCW);
  }
}
