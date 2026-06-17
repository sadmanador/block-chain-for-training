import bcrypt from 'bcryptjs';
import connectDB from '../lib/db';
import Block from '../models/Block';
import User from '../models/User';
import localBlockchain from '../lib/localBlockchain';

const SALT_ROUNDS = 12;

async function seedDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Block.deleteMany({});
    console.log('Cleared existing data');

    // Reset local blockchain — initial balances are embedded in genesis block
    await localBlockchain.resetChain({ alice: 1000, bob: 1000, admin: 0 });
    console.log('Reset local blockchain');

    // Create users
    const users = [
      {
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: await bcrypt.hash('password123', SALT_ROUNDS),
        role: 'user' as const,
        balance: 1000,
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: await bcrypt.hash('password123', SALT_ROUNDS),
        role: 'user' as const,
        balance: 1000,
      },
      {
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('admin123', SALT_ROUNDS),
        role: 'admin' as const,
        balance: 0,
      },
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Created users:');
    createdUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.role}): balance = ${user.balance}`);
    });

    // Local blockchain already has genesis block from reset
    const genesisBlock = await localBlockchain.getBlockByIndex(0);
    
    // Also save genesis block to MongoDB for querying
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
      console.log('Created genesis block:', genesisBlock.index);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Alice: username=alice, password=password123');
    console.log('  Bob:   username=bob, password=password123');
    console.log('  Admin: username=admin, password=admin123');
    console.log('\n💾 Blockchain stored in: data/blockchain.json');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedDatabase();
