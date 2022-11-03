import { IConsumer } from '../../../relayer/src/services/consumer/interface/IConsumer';
import { ICCMPService } from '../../task-manager/types';

export interface IRetryTransactionService extends IConsumer {
  ccmpService: ICCMPService;
}
