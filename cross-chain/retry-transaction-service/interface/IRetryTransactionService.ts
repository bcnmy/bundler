import { IConsumer } from '../../../relayer/src/services/consumer/interface/IConsumer';
import { ICrossChainTransactionHandlerService } from '../../task-manager/types';

export interface IRetryTransactionService extends IConsumer {
  ccmpService: ICrossChainTransactionHandlerService;
}
