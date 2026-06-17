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
  // Legacy fallback field for chains whose genesis block predates the init-entry format.
  // Stored alongside the chain in blockchain.json.
  private initialBalances: Record<string, number> = {};

  // Always re-read from disk so in-memory state never diverges from the file.
  // This is intentional: for a file-based teaching blockchain, disk is the truth.
  async init(): Promise<void> {
    try {
      const data = await fs.readFile(BLOCKCHAIN_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.chain = parsed;
        this.initialBalances = {};
      } else {
        this.chain = parsed.chain ?? [];
        this.initialBalances = parsed.initialBalances ?? {};
      }
      if (this.chain.length === 0) {
        await this.createGenesisBlock({});
      }
    } catch {
      // File missing or corrupt — start fresh
      if (this.chain.length === 0) {
        await this.createGenesisBlock({});
      }
    }
  }

  // initBalances entries are embedded into the genesis block as
  // {type:"init", user, balance} records so they are covered by the SHA-256 hash.
  // Any attempt to change who started with what breaks the chain.
  private async createGenesisBlock(initBalances: Record<string, number>): Promise<void> {
    const initTxs = Object.entries(initBalances).map(([user, balance]) => ({
      type: 'init',
      user,
      balance,
    }));

    const genesisBlock: Block = {
      index: 0,
      timestamp: Date.now(),
      transactions: JSON.stringify(initTxs),
      previousHash: '0',
      hash: '',
      nonce: 0,
    };

    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain = [genesisBlock];
    this.initialBalances = { ...initBalances };
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

    if (this.chain.length === 0) {
      return { valid: false, message: 'Blockchain is empty' };
    }

    if (this.chain[0].index !== 0 || this.chain[0].previousHash !== '0') {
      return { valid: false, tamperedBlock: 0, message: 'Genesis block is invalid' };
    }

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

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.index !== previousBlock.index + 1) {
        return { valid: false, tamperedBlock: i, message: `Block ${i} has invalid index` };
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return { valid: false, tamperedBlock: i, message: `Block ${i} has invalid previous hash link` };
      }

      const calculatedHash = this.calculateHash({
        index: currentBlock.index,
        timestamp: currentBlock.timestamp,
        transactions: currentBlock.transactions,
        previousHash: currentBlock.previousHash,
        nonce: currentBlock.nonce,
      });

      if (calculatedHash !== currentBlock.hash) {
        return { valid: false, tamperedBlock: i, message: `Block ${i} hash mismatch - data may have been tampered` };
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
    if (this.chain.length === 0) throw new Error('Blockchain is empty');
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
        try {
          const txs = JSON.parse(block.transactions);
          details.push(`  - Transactions in block: ${txs.length}`);
        } catch {
          details.push(`  - Invalid transaction data`);
        }
      }

      if (i > 0) {
        const prevBlock = this.chain[i - 1];
        if (block.previousHash !== prevBlock.hash) {
          details.push(`Block ${i}: Broken chain link with Block ${i - 1}`);
        }
      }
    }

    return { tampered: details.length > 0, details };
  }

  // Compute what every user's balance should be, derived purely from the blockchain.
  // Source priority:
  //   1. {type:"init"} entries in the genesis block (hash-protected — new chains)
  //   2. The initialBalances field in blockchain.json (legacy fallback — old chains)
  async computeExpectedBalances(): Promise<Record<string, number>> {
    await this.init();

    let balances: Record<string, number> = {};

    // Read initial balances from genesis init entries
    if (this.chain.length > 0) {
      const genesisTxs: any[] = JSON.parse(this.chain[0].transactions);
      for (const tx of genesisTxs) {
        if (tx.type === 'init') {
          balances[tx.user] = tx.balance;
        }
      }
    }

    // Fall back to the file-level field for pre-existing chains
    if (Object.keys(balances).length === 0) {
      balances = { ...this.initialBalances };
    }

    // Apply every regular (non-init) transaction
    for (const block of this.chain) {
      const txs: any[] = JSON.parse(block.transactions);
      for (const tx of txs) {
        if (tx.type === 'init') continue;
        if (tx.sender && tx.receiver && tx.amount != null) {
          if (balances[tx.sender] !== undefined) balances[tx.sender] -= tx.amount;
          if (balances[tx.receiver] !== undefined) balances[tx.receiver] += tx.amount;
        }
      }
    }

    return balances;
  }

  async getInitialBalances(): Promise<Record<string, number>> {
    await this.init();
    if (this.chain.length > 0) {
      const genesisTxs: any[] = JSON.parse(this.chain[0].transactions);
      const initEntries = genesisTxs.filter((tx: any) => tx.type === 'init');
      if (initEntries.length > 0) {
        return Object.fromEntries(initEntries.map((tx: any) => [tx.user, tx.balance]));
      }
    }
    return { ...this.initialBalances };
  }

  async getRawFile(): Promise<string> {
    return fs.readFile(BLOCKCHAIN_FILE, 'utf-8');
  }

  private async saveChain(): Promise<void> {
    await fs.mkdir(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
    await fs.writeFile(
      BLOCKCHAIN_FILE,
      JSON.stringify({ chain: this.chain, initialBalances: this.initialBalances }, null, 2)
    );
  }

  async simulateTampering(blockIndex: number, newAmount: number): Promise<void> {
    await this.init();

    if (blockIndex >= this.chain.length) throw new Error('Block index out of range');

    const block = this.chain[blockIndex];
    const transactions = JSON.parse(block.transactions);

    if (transactions.length > 0 && transactions[0].amount !== undefined) {
      transactions[0].amount = newAmount;
      block.transactions = JSON.stringify(transactions);
      // Intentionally not recalculating hash — this simulates tampering
      await this.saveChain();
    }
  }

  async resetChain(initBalances: Record<string, number> = {}): Promise<void> {
    this.chain = [];
    this.initialBalances = {};
    try {
      await fs.unlink(BLOCKCHAIN_FILE);
    } catch {
      // File might not exist
    }
    await this.createGenesisBlock(initBalances);
  }
}

const localBlockchain = new LocalBlockchain();

export default localBlockchain;
