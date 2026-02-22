import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const BLOCKCHAIN_FILE = path.join(process.cwd(), 'data', 'blockchain.json');

export interface Block {
  index: number;
  timestamp: number;
  transactions: string;
  previousHash: string;
  hash: string;
  nonce: number;
}

class LocalBlockchain {
  private chain: Block[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const data = await fs.readFile(BLOCKCHAIN_FILE, 'utf-8');
      this.chain = JSON.parse(data);
      console.log(`[LocalBlockchain] Loaded ${this.chain.length} blocks from file`);
    } catch (error) {
      // File doesn't exist, create genesis block
      await this.createGenesisBlock();
    }
    
    this.initialized = true;
  }

  private async createGenesisBlock(): Promise<void> {
    const genesisBlock: Block = {
      index: 0,
      timestamp: Date.now(),
      transactions: JSON.stringify([]),
      previousHash: '0',
      hash: '',
      nonce: 0,
    };
    
    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain = [genesisBlock];
    await this.saveChain();
    console.log('[LocalBlockchain] Created genesis block');
  }

  private calculateHash(block: Omit<Block, 'hash'>): string {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      transactions: block.transactions,
      previousHash: block.previousHash,
      nonce: block.nonce,
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async addBlock(transactions: any[]): Promise<Block> {
    await this.init();
    
    const previousBlock = this.chain[this.chain.length - 1];
    const newBlock: Block = {
      index: previousBlock.index + 1,
      timestamp: Date.now(),
      transactions: JSON.stringify(transactions),
      previousHash: previousBlock.hash,
      hash: '',
      nonce: 0,
    };
    
    newBlock.hash = this.calculateHash(newBlock);
    this.chain.push(newBlock);
    await this.saveChain();
    
    return newBlock;
  }

  async validateChain(): Promise<{ valid: boolean; tamperedBlock?: number; message: string }> {
    await this.init();
    
    // Check genesis block
    if (this.chain[0].index !== 0 || this.chain[0].previousHash !== '0') {
      return { valid: false, tamperedBlock: 0, message: 'Genesis block is invalid' };
    }
    
    // Verify genesis block hash
    const genesisHash = this.calculateHash({
      index: this.chain[0].index,
      timestamp: this.chain[0].timestamp,
      transactions: this.chain[0].transactions,
      previousHash: this.chain[0].previousHash,
      nonce: this.chain[0].nonce,
    });
    
    if (genesisHash !== this.chain[0].hash) {
      return { valid: false, tamperedBlock: 0, message: 'Genesis block hash mismatch' };
    }
    
    // Validate each block
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Check index continuity
      if (currentBlock.index !== previousBlock.index + 1) {
        return { 
          valid: false, 
          tamperedBlock: i, 
          message: `Block ${i} has invalid index` 
        };
      }
      
      // Check hash link
      if (currentBlock.previousHash !== previousBlock.hash) {
        return { 
          valid: false, 
          tamperedBlock: i, 
          message: `Block ${i} has invalid previous hash link` 
        };
      }
      
      // Verify hash
      const calculatedHash = this.calculateHash({
        index: currentBlock.index,
        timestamp: currentBlock.timestamp,
        transactions: currentBlock.transactions,
        previousHash: currentBlock.previousHash,
        nonce: currentBlock.nonce,
      });
      
      if (calculatedHash !== currentBlock.hash) {
        return { 
          valid: false, 
          tamperedBlock: i, 
          message: `Block ${i} hash mismatch - data may have been tampered` 
        };
      }
    }
    
    return { valid: true, message: 'Blockchain is valid' };
  }

  async getChain(): Promise<Block[]> {
    await this.init();
    return [...this.chain];
  }

  async getLatestBlock(): Promise<Block> {
    await this.init();
    return this.chain[this.chain.length - 1];
  }

  async getBlockByIndex(index: number): Promise<Block | undefined> {
    await this.init();
    return this.chain.find(b => b.index === index);
  }

  async detectTampering(): Promise<{ tampered: boolean; details: string[] }> {
    await this.init();
    const details: string[] = [];
    
    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      const calculatedHash = this.calculateHash({
        index: block.index,
        timestamp: block.timestamp,
        transactions: block.transactions,
        previousHash: block.previousHash,
        nonce: block.nonce,
      });
      
      if (calculatedHash !== block.hash) {
        details.push(`Block ${i}: Hash mismatch detected!`);
        
        // Try to figure out what changed
        try {
          const transactions = JSON.parse(block.transactions);
          details.push(`  - Transactions in block: ${transactions.length}`);
        } catch (e) {
          details.push(`  - Invalid transaction data`);
        }
      }
      
      if (i > 0) {
        const prevBlock = this.chain[i - 1];
        if (block.previousHash !== prevBlock.hash) {
          details.push(`Block ${i}: Broken chain link with Block ${i-1}`);
        }
      }
    }
    
    return {
      tampered: details.length > 0,
      details
    };
  }

  private async saveChain(): Promise<void> {
    await fs.mkdir(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
    await fs.writeFile(BLOCKCHAIN_FILE, JSON.stringify(this.chain, null, 2));
  }

  // For demo purposes - simulate tampering
  async simulateTampering(blockIndex: number, newAmount: number): Promise<void> {
    await this.init();
    
    if (blockIndex >= this.chain.length) {
      throw new Error('Block index out of range');
    }
    
    const block = this.chain[blockIndex];
    const transactions = JSON.parse(block.transactions);
    
    if (transactions.length > 0 && transactions[0].amount !== undefined) {
      transactions[0].amount = newAmount;
      block.transactions = JSON.stringify(transactions);
      // Don't recalculate hash - this simulates tampering!
      await this.saveChain();
    }
  }

  async resetChain(): Promise<void> {
    this.chain = [];
    this.initialized = false;
    try {
      await fs.unlink(BLOCKCHAIN_FILE);
    } catch (e) {
      // File might not exist
    }
    await this.createGenesisBlock();
  }
}

// Singleton instance
const localBlockchain = new LocalBlockchain();

export default localBlockchain;
