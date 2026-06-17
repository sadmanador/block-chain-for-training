import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import connectDB from './db';
import BlockchainState from '@/models/BlockchainState';

// Kept for local dev: the file is written as a side-effect so students can inspect it.
// On Vercel the write silently fails — MongoDB is always the real store.
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
  private initialBalances: Record<string, number> = {};

  // Always re-reads from MongoDB (primary) so in-memory state never diverges from
  // the persistent store. Falls back to the local file during first-run / migration.
  async init(): Promise<void> {
    await connectDB();

    const state = await BlockchainState.findOne();
    if (state) {
      const parsed = JSON.parse(state.data);
      this.chain = parsed.chain ?? [];
      this.initialBalances = parsed.initialBalances ?? {};
      if (this.chain.length === 0) await this.createGenesisBlock({});
      return;
    }

    // No MongoDB record yet — try to migrate from local file
    try {
      const raw = await fs.readFile(BLOCKCHAIN_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.chain = parsed;
        this.initialBalances = {};
      } else {
        this.chain = parsed.chain ?? [];
        this.initialBalances = parsed.initialBalances ?? {};
      }
      if (this.chain.length === 0) {
        await this.createGenesisBlock({});
      } else {
        // Persist migrated data to MongoDB
        await this.saveChain();
        console.log('[LocalBlockchain] Migrated from file to MongoDB');
      }
    } catch {
      // File missing — fresh start
      await this.createGenesisBlock({});
    }
  }

  // initBalances entries are embedded in the genesis block as {type:"init", user, balance}
  // records so they are covered by the SHA-256 hash. Any tampering with starting balances
  // breaks the chain.
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

    if (this.chain.length === 0) return { valid: false, message: 'Blockchain is empty' };

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
      const cur = this.chain[i];
      const prev = this.chain[i - 1];

      if (cur.index !== prev.index + 1) {
        return { valid: false, tamperedBlock: i, message: `Block ${i} has invalid index` };
      }
      if (cur.previousHash !== prev.hash) {
        return { valid: false, tamperedBlock: i, message: `Block ${i} has invalid previous hash link` };
      }

      const calcHash = this.calculateHash({
        index: cur.index,
        timestamp: cur.timestamp,
        transactions: cur.transactions,
        previousHash: cur.previousHash,
        nonce: cur.nonce,
      });

      if (calcHash !== cur.hash) {
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
      const calcHash = this.calculateHash({
        index: block.index,
        timestamp: block.timestamp,
        transactions: block.transactions,
        previousHash: block.previousHash,
        nonce: block.nonce,
      });

      if (calcHash !== block.hash) {
        details.push(`Block ${i}: Hash mismatch detected!`);
        try {
          const txs = JSON.parse(block.transactions);
          details.push(`  - Transactions in block: ${txs.length}`);
        } catch {
          details.push(`  - Invalid transaction data`);
        }
      }

      if (i > 0 && block.previousHash !== this.chain[i - 1].hash) {
        details.push(`Block ${i}: Broken chain link with Block ${i - 1}`);
      }
    }

    return { tampered: details.length > 0, details };
  }

  // Compute what every user's balance should be, derived purely from the blockchain.
  // Source priority:
  //   1. {type:"init"} entries in the genesis block (hash-protected — new chains)
  //   2. The initialBalances field in the JSON (legacy fallback — old chains)
  async computeExpectedBalances(): Promise<Record<string, number>> {
    await this.init();

    let balances: Record<string, number> = {};

    if (this.chain.length > 0) {
      const genesisTxs: any[] = JSON.parse(this.chain[0].transactions);
      for (const tx of genesisTxs) {
        if (tx.type === 'init') balances[tx.user] = tx.balance;
      }
    }

    if (Object.keys(balances).length === 0) {
      balances = { ...this.initialBalances };
    }

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

  // Returns the blockchain as formatted JSON — used by the admin raw-file viewer.
  // On Vercel the local file may not exist; we return the in-memory state instead.
  async getRawFile(): Promise<string> {
    await this.init();
    return JSON.stringify(
      { chain: this.chain, initialBalances: this.initialBalances },
      null,
      2
    );
  }

  private async saveChain(): Promise<void> {
    await connectDB();

    const payload = JSON.stringify({ chain: this.chain, initialBalances: this.initialBalances });

    // Primary store: MongoDB (works everywhere including Vercel)
    await BlockchainState.findOneAndUpdate(
      {},
      { data: payload, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // Secondary store: local file (best-effort, silently ignored on Vercel)
    try {
      await fs.mkdir(path.dirname(BLOCKCHAIN_FILE), { recursive: true });
      await fs.writeFile(
        BLOCKCHAIN_FILE,
        JSON.stringify({ chain: this.chain, initialBalances: this.initialBalances }, null, 2)
      );
    } catch {
      // Read-only filesystem (Vercel) — MongoDB record is the source of truth
    }
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

    await connectDB();
    await BlockchainState.deleteMany({});

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
