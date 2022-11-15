import mongoose from 'mongoose';
import { ICrossChainTransaction } from '../../interface/ICrossChainTransaction';

const { Schema } = mongoose;

export const CrossChainTransactionSchema = new Schema<ICrossChainTransaction>({
  transactionId: {
    type: String,
    required: true,
  },
  sourceTransactionHash: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  statusLog: {
    type: [
      {
        sourceTxHash: {
          type: String,
        },
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Number,
          required: true,
        },
        context: {
          type: Object,
        },
        error: {
          type: Boolean,
        },
      },
    ],
  },
  creationTime: {
    type: Number,
    required: true,
  },
  updationTime: {
    type: Number,
  },
  message: {
    type: {
      sender: {
        type: String,
        required: true,
      },
      sourceGateway: {
        type: String,
        required: true,
      },
      sourceAdaptor: {
        type: String,
        required: true,
      },
      sourceChainId: {
        type: Number,
        required: true,
      },
      destinationGateway: {
        type: String,
        required: true,
      },
      destinationChainId: {
        type: Number,
        required: true,
      },
      nonce: {
        type: String,
        required: true,
      },
      routerAdaptor: {
        type: String,
        required: true,
      },
      gasFeePaymentArgs: {
        type: {
          feeAmount: {
            type: String,
          },
          feeTokenAddress: {
            type: String,
          },
          relayer: {
            type: String,
          },
        },
        required: true,
      },
      payload: {
        type: [
          {
            to: {
              type: String,
            },
            _calldata: {
              type: String,
            },
          },
        ],
        required: true,
      },
      hash: {
        type: String,
      },
    },
  },
  verificationData: {
    type: String,
  },
  retryCount: {
    type: Number,
    required: true,
    default: 0,
  },
});
