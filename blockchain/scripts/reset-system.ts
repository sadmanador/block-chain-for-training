import connectDB from '../lib/db';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Block from '../models/Block';
import localBlockchain from '../lib/localBlockchain';

const DEFAULT_USER_BALANCE = 5000;

async function resetSystem() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // 1. Reset Transactions
    await Transaction.deleteMany({});
    console.log('Deleted all transactions from MongoDB');

    // 2. Reset Blocks in MongoDB
    await Block.deleteMany({});
    console.log('Deleted all blocks from MongoDB');

    // 3. Build initial balances for ALL users in the database
    const allUsers = await User.find({}).select('username role');
    const initBalances: Record<string, number> = {};
    for (const user of allUsers) {
      initBalances[user.username] = user.role === 'admin' ? 0 : DEFAULT_USER_BALANCE;
    }
    console.log('Initial balances:', initBalances);

    // 4. Reset blockchain — initial balances are embedded in genesis block (hash-protected)
    await localBlockchain.resetChain(initBalances);
    console.log('Reset local blockchain file (data/blockchain.json)');

    // 5. Reset MongoDB user balances to match
    for (const user of allUsers) {
      await User.updateOne({ _id: user._id }, { balance: initBalances[user.username] });
      console.log(`  - ${user.username}: ${initBalances[user.username]} VC`);
    }

    // 6. Restore genesis block in MongoDB (required for UI/verification)
    const genesisBlock = await localBlockchain.getBlockByIndex(0);
    if (genesisBlock) {
      await Block.create({
        index: genesisBlock.index,
        timestamp: new Date(genesisBlock.timestamp),
        transactions: [],
        previousHash: genesisBlock.previousHash,
        hash: genesisBlock.hash,
        nonce: genesisBlock.nonce,
        fabricTxId: 'genesis',
      });
      console.log('Restored genesis block in MongoDB');
    }

    console.log('\n✅ System reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetSystem();
