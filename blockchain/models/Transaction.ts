import mongoose, { Schema } from 'mongoose';
import { ITransaction } from '../types';

const TransactionSchema = new Schema<ITransaction>({
  txId: {
    type: String,
    required: true,
    unique: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'reverted'],
    default: 'pending',
  },
  blockIndex: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Fields for tracking tampering and reverts
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  modifiedAt: {
    type: Date,
    default: null,
  },
  revertedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  revertedAt: {
    type: Date,
    default: null,
  },
  originalTamperedAmount: {
    type: Number,
    default: null,
  },
});

TransactionSchema.index({ sender: 1, timestamp: -1 });
TransactionSchema.index({ receiver: 1, timestamp: -1 });

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
