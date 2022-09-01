import { TransactionType } from '../../common/types';
import { Consumer } from './consumer';

export class AAConsumer extends Consumer {
  constructor(chainId: number) {
    super(chainId, TransactionType.AA);
  }
}
