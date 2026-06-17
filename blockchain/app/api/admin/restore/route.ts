import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Block from '@/models/Block';
import localBlockchain from '@/lib/localBlockchain';

const DEFAULT_USER_BALANCE = 5000;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // 1. Reset Transactions
    await Transaction.deleteMany({});

    // 2. Reset Blocks in MongoDB
    await Block.deleteMany({});

    // 3. Build initial balances for ALL users so the genesis block records everyone.
    //    Non-admin users get the default starting balance; admins get 0.
    const allUsers = await User.find({}).select('username role');
    const initBalances: Record<string, number> = {};
    for (const user of allUsers) {
      initBalances[user.username] = user.role === 'admin' ? 0 : DEFAULT_USER_BALANCE;
    }

    // 4. Reset blockchain — embeds initBalances inside the genesis block so they
    //    are hash-protected and tamper-evident.
    await localBlockchain.resetChain(initBalances);

    // 5. Restore user balances in MongoDB to match the blockchain initial state
    for (const user of allUsers) {
      user.balance = initBalances[user.username];
      await user.save();
    }

    // 6. Mirror genesis block in MongoDB (needed for any Mongo-based queries)
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
    }

    return NextResponse.json({
      success: true,
      message: `System restored. ${allUsers.length} user(s) reset to initial balances.`,
      users: allUsers.map(u => ({ username: u.username, balance: initBalances[u.username] })),
    });
  } catch (error) {
    console.error('Error restoring system:', error);
    return NextResponse.json({ error: 'Failed to restore system' }, { status: 500 });
  }
}
