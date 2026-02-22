import mongoose, { Schema } from 'mongoose';
import { IBlock } from '../types';

const BlockSchema = new Schema<IBlock>({
  index: {
    type: Number,
    required: true,
    unique: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
  }],
  previousHash: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  nonce: {
    type: Number,
    default: 0,
  },
  fabricTxId: {
    type: String,
    default: '',
  },
});

BlockSchema.index({ index: 1 });

export default mongoose.models.Block || mongoose.model<IBlock>('Block', BlockSchema);
