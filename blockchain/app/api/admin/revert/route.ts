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

    const { txId } = await request.json();

    if (!txId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    await connectDB();
    await localBlockchain.init();

    // Find the transaction in blockchain
    const chain = await localBlockchain.getChain();
    let blockchainTx = null;
    let blockIndex = -1;

    for (const block of chain) {
      const transactions = JSON.parse(block.transactions);
      const found = transactions.find((tx: any) => tx.txId === txId);
      if (found) {
        blockchainTx = found;
        blockIndex = block.index;
        break;
      }
    }

    if (!blockchainTx) {
      return NextResponse.json(
        { error: 'Transaction not found in blockchain' },
        { status: 404 }
      );
    }

    // Find the transaction in DB
    const dbTx = await Transaction.findOne({ txId }).populate('sender receiver');
    
    if (!dbTx) {
      return NextResponse.json(
        { error: 'Transaction not found in database' },
        { status: 404 }
      );
    }

    // Calculate the difference to adjust user balances
    const oldAmount = dbTx.amount;
    const newAmount = blockchainTx.amount;
    const difference = newAmount - oldAmount;

    // Get sender and receiver
    const sender = await User.findOne({ username: blockchainTx.sender });
    const receiver = await User.findOne({ username: blockchainTx.receiver });

    if (!sender || !receiver) {
      return NextResponse.json(
        { error: 'Sender or receiver not found' },
        { status: 404 }
      );
    }

    // Update the transaction
    dbTx.amount = blockchainTx.amount;
    dbTx.revertedBy = session.user.id;
    dbTx.revertedAt = new Date();
    dbTx.originalTamperedAmount = oldAmount;
    await dbTx.save();

    // Adjust balances if amount changed
    if (difference !== 0) {
      sender.balance -= difference;
      receiver.balance += difference;
      await sender.save();
      await receiver.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction reverted successfully',
      transaction: {
        txId,
        blockIndex,
        oldAmount,
        newAmount,
        difference,
        sender: sender.username,
        receiver: receiver.username,
        revertedBy: session.user.username,
        revertedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error reverting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to revert transaction' },
      { status: 500 }
    );
  }
}
