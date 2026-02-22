import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import localBlockchain from '@/lib/localBlockchain';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await localBlockchain.init();
    
    const userId = session.user.id;
    
    // Get transactions from MongoDB
    const dbTransactions = await Transaction.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ timestamp: -1 })
      .limit(50);

    // Get blockchain data for comparison
    const blockchain = await localBlockchain.getChain();
    
    // Cross-reference and detect tampering
    const transactionsWithTamperCheck = dbTransactions.map((tx: any) => {
      // Find corresponding block in blockchain
      const block = blockchain.find(b => {
        const blockTxs = JSON.parse(b.transactions);
        return blockTxs.some((blockTx: any) => blockTx.txId === tx.txId);
      });
      
      let tampered = false;
      let originalAmount = null;
      
      if (block) {
        const blockTxs = JSON.parse(block.transactions);
        const blockchainTx = blockTxs.find((blockTx: any) => blockTx.txId === tx.txId);
        
        if (blockchainTx) {
          // Compare amounts
          if (blockchainTx.amount !== tx.amount) {
            tampered = true;
            originalAmount = blockchainTx.amount;
          }
          
          // Also check other fields
          if (blockchainTx.sender !== tx.sender?.username || 
              blockchainTx.receiver !== tx.receiver?.username) {
            tampered = true;
          }
        }
      }
      
      return {
        ...tx.toObject(),
        tampered,
        originalAmount,
        blockchainVerified: !!block,
      };
    });

    // Check if any tampering detected
    const tamperedCount = transactionsWithTamperCheck.filter((t: any) => t.tampered).length;
    const blockchainValid = (await localBlockchain.validateChain()).valid;

    return NextResponse.json({ 
      transactions: transactionsWithTamperCheck,
      tamperingDetected: tamperedCount > 0,
      tamperedCount,
      blockchainValid,
      verificationSource: 'local-blockchain',
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, amount } = await request.json();

    if (!receiverId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid receiver or amount' }, { status: 400 });
    }

    await connectDB();
    
    const sender = await User.findById(session.user.id);
    const receiver = await User.findById(receiverId);

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    if (sender.id === receiver.id) {
      return NextResponse.json({ error: 'Cannot send funds to yourself' }, { status: 400 });
    }

    if (sender.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    await localBlockchain.init();
    const latestBlock = await localBlockchain.getLatestBlock();
    const txId = uuidv4();

    // Create the transaction record
    const newTransaction = new Transaction({
      txId,
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status: 'confirmed',
      blockIndex: latestBlock.index + 1,
      timestamp: new Date(),
    });

    // Add to blockchain
    const blockchainTx = {
      txId,
      sender: sender.username,
      receiver: receiver.username,
      amount,
      timestamp: newTransaction.timestamp.getTime(),
    };

    await localBlockchain.addBlock([blockchainTx]);

    // Save to DB
    await newTransaction.save();

    // Update balances
    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    return NextResponse.json({
      success: true,
      transaction: {
        txId,
        sender: sender.username,
        receiver: receiver.username,
        amount,
      },
      newBalance: sender.balance,
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction' },
      { status: 500 }
    );
  }
}
