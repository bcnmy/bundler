import { ITransactionService } from './interface/ITransactionService';
import { ITransactionListener } from '../transaction-listener';
import { EVMTransactionResponseType, TransactionDataType, TransactionServiceParamsType } from './types';
import { INonceManager } from '../nonce-manager';
import { INetworkService } from '../../../../common/network';
import { IEVMAccount } from '../account/interface/IEVMAccount';
import { EVMRawTransactionType } from '../../../../common/types';
import { GasPriceType } from '../../../../common/gas-price/types';
import { IGasPrice } from '../../../../common/gas-price/interface/IGasPrice';

export class EVMTransactionService implements
ITransactionService<IEVMAccount<EVMRawTransactionType>> {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  transactionListener: ITransactionListener;

  nonceManager: INonceManager;

  gasPriceService: IGasPrice; 

  constructor(transactionServiceParams: TransactionServiceParamsType) {
    const {
      chainId, networkService, transactionListener, nonceManager, 
    } = transactionServiceParams;
    this.chainId = chainId;
    this.networkService = networkService;
    this.transactionListener = transactionListener;
    this.nonceManager = nonceManager;

  }

  private getGasPrice(speed: GasPriceType) {
    // Import from service manager class

  }

  private getNonce() {
    // get nonce via nonceManager instance
  }

  private incrementNonce() {
    // increment nonce via nonceManager instance
  }

  private notifyTransactionListener() {
    // call transaction listener
  }

  private createTransaction(createTransactionParams: CreateRawTransactionParamsType) {
    // create raw transaction basis on data passed
    const { to,
      value,
      data,
      gasLimit,
      speed 
    } = createTransactionParams;
    const gasPrice = this.getGasPrice(speed);
    const rawtx = {

    }
  }

  // eslint-disable-next-line max-len
  sendTransaction(transactionData: TransactionDataType, account: IEVMAccount<EVMRawTransactionType>): Promise<EVMTransactionResponseType> {
    // create transaction
    // get gas price
    // send transaction
    // tell to transaction listener
    const {
      to, value, data, gasLimitFromClient, gasLimitInSimulation, speed, transactionId
    } = transactionData;
    const gasLimit = gasLimitFromClient ? gasLimitFromClient : gasLimitInSimulation;
    const transaction = this.createTransaction({
      to,
      value,
      data,
      gasLimit,
      speed
    });
  }
}
