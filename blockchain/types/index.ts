import { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  balance: number;
  createdAt: Date;
}

export interface ITransaction extends Document {
  txId: string;
  sender: Schema.Types.ObjectId;
  receiver: Schema.Types.ObjectId;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
  blockIndex: number;
  timestamp: Date;
  modifiedBy?: Schema.Types.ObjectId;
  modifiedAt?: Date;
  revertedBy?: Schema.Types.ObjectId;
  revertedAt?: Date;
  originalTamperedAmount?: number;
}

export interface IBlock extends Document {
  index: number;
  timestamp: Date;
  transactions: Schema.Types.ObjectId[];
  previousHash: string;
  hash: string;
  nonce: number;
  fabricTxId: string;
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface TransferRequest {
  receiverId: string;
  amount: number;
}

export interface BlockData {
  index: number;
  timestamp: number;
  transactions: string;
  previousHash: string;
  nonce: number;
}
