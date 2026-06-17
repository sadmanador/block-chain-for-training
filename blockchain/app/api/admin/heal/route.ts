import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import localBlockchain from '@/lib/localBlockchain';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await localBlockchain.init();

    const chain = await localBlockchain.getChain();
    let healedTxCount = 0;

    // 1. Fix tampered transaction amounts
    for (const block of chain) {
      const transactions = JSON.parse(block.transactions);

      for (const blockchainTx of transactions) {
        if (blockchainTx.type === 'init') continue;

        const dbTx = await Transaction.findOne({ txId: blockchainTx.txId })
          .populate('sender receiver');

        if (dbTx && dbTx.amount !== blockchainTx.amount) {
          const tamperedAmount = dbTx.amount;
          dbTx.amount = blockchainTx.amount;
          dbTx.revertedBy = session.user.id;
          dbTx.revertedAt = new Date();
          dbTx.originalTamperedAmount = tamperedAmount;
          await dbTx.save();
          healedTxCount++;
        }
      }
    }

    // 2. Recompute every user's balance from the blockchain and fix discrepancies.
    //    This catches direct balance edits in MongoDB that no transaction tampering
    //    would explain.
    const expectedBalances = await localBlockchain.computeExpectedBalances();
    let healedBalanceCount = 0;
    const balanceChanges: { username: string; oldBalance: number; newBalance: number }[] = [];

    for (const [username, expected] of Object.entries(expectedBalances)) {
      const user = await User.findOne({ username });
      if (user && user.balance !== expected) {
        balanceChanges.push({ username, oldBalance: user.balance, newBalance: expected });
        user.balance = expected;
        await user.save();
        healedBalanceCount++;
      }
    }

    const parts: string[] = [];
    if (healedTxCount > 0) parts.push(`${healedTxCount} transaction(s) healed`);
    if (healedBalanceCount > 0) parts.push(`${healedBalanceCount} balance(s) restored`);
    const message = parts.length > 0 ? parts.join(', ') + '.' : 'No discrepancies found — everything matches the blockchain.';

    return NextResponse.json({
      success: true,
      message,
      healedTxCount,
      healedBalanceCount,
      balanceChanges,
    });
  } catch (error) {
    console.error('Error healing:', error);
    return NextResponse.json({ error: 'Failed to heal' }, { status: 500 });
  }
}
