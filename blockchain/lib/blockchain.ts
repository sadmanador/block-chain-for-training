import crypto from 'crypto';
import connectDB from './db';
import Block from '@/models/Block';
import { BlockData } from '@/types';

export function generateHash(blockData: BlockData): string {
  const data = JSON.stringify({
    index: blockData.index,
    timestamp: blockData.timestamp,
    transactions: blockData.transactions,
    previousHash: blockData.previousHash,
    nonce: blockData.nonce,
  });
  
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function getLatestBlock() {
  await connectDB();
  const block = await Block.findOne().sort({ index: -1 });
  return block;
}

export async function createBlock(
  transactionIds: string[],
  previousHash: string,
  fabricTxId: string = ''
): Promise<{ index: number; hash: string }> {
  await connectDB();
  
  const latestBlock = await getLatestBlock();
  const newIndex = latestBlock ? latestBlock.index + 1 : 0;
  const timestamp = Date.now();
  
  const blockData: BlockData = {
    index: newIndex,
    timestamp,
    transactions: JSON.stringify(transactionIds),
    previousHash,
    nonce: 0,
  };
  
  const hash = generateHash(blockData);
  
  await Block.create({
    index: newIndex,
    timestamp: new Date(timestamp),
    transactions: transactionIds,
    previousHash,
    hash,
    nonce: 0,
    fabricTxId,
  });
  
  return { index: newIndex, hash };
}

export async function validateChain(): Promise<boolean> {
  await connectDB();
  
  const blocks = await Block.find().sort({ index: 1 });
  
  if (blocks.length === 0) return true;
  
  // Check genesis block
  if (blocks[0].index !== 0 || blocks[0].previousHash !== '0') {
    return false;
  }
  
  // Validate each block
  for (let i = 1; i < blocks.length; i++) {
    const currentBlock = blocks[i];
    const previousBlock = blocks[i - 1];
    
    // Check index continuity
    if (currentBlock.index !== previousBlock.index + 1) {
      return false;
    }
    
    // Check hash link
    if (currentBlock.previousHash !== previousBlock.hash) {
      return false;
    }
    
    // Verify hash
    const blockData: BlockData = {
      index: currentBlock.index,
      timestamp: currentBlock.timestamp.getTime(),
      transactions: JSON.stringify(currentBlock.transactions),
      previousHash: currentBlock.previousHash,
      nonce: currentBlock.nonce,
    };
    
    const calculatedHash = generateHash(blockData);
    if (calculatedHash !== currentBlock.hash) {
      return false;
    }
  }
  
  return true;
}

export function truncateHash(hash: string, length: number = 16): string {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}
