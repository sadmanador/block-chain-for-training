import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db';
import Block from '@/models/Block';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import localBlockchain from '@/lib/localBlockchain';
import { truncateHash } from '@/lib/blockchain';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    await localBlockchain.init();
    
    // Get local blockchain data (THE SOURCE OF TRUTH)
    const localChain = await localBlockchain.getChain();
    const validation = await localBlockchain.validateChain();
    const tampering = await localBlockchain.detectTampering();
    
    // Get all DB transactions for cross-reference (with revert info)
    const dbTransactions = await Transaction.find()
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .populate('revertedBy', 'username');
    const dbTxMap = new Map(dbTransactions.map((t: any) => [t.txId, t]));
    
    // Build blocks with tamper detection
    const blocks = localChain.map(block => {
      const transactions = JSON.parse(block.transactions);
      
      // Check each transaction against DB
      const processedTxs = transactions.map((tx: any) => {
        const dbTx = dbTxMap.get(tx.txId);
        let tampered = false;
        let dbAmount = null;
        let modificationInfo = null;
        
        if (dbTx) {
          dbAmount = dbTx.amount;
          if (dbTx.amount !== tx.amount || 
              dbTx.sender?.username !== tx.sender || 
              dbTx.receiver?.username !== tx.receiver) {
            tampered = true;
            
            // Determine who modified it
            if (dbTx.modifiedBy) {
              modificationInfo = {
                type: 'user',
                userId: dbTx.modifiedBy,
                modifiedAt: dbTx.modifiedAt,
              };
            } else {
              // No modifiedBy field means direct DB access
              // Extract username from MongoDB URI
              const mongoUri = process.env.MONGODB_URI || '';
              const dbUserMatch = mongoUri.match(/\/\/([^:]+):/);
              const dbUsername = dbUserMatch ? dbUserMatch[1] : 'unknown';
              
              modificationInfo = {
                type: 'database',
                dbUsername,
                message: `Modified directly in database (User: ${dbUsername})`,
              };
            }
          }
          
          // Check if it was reverted
          if (dbTx.revertedBy) {
            modificationInfo = {
              ...modificationInfo,
              reverted: true,
              revertedBy: dbTx.revertedBy?.username || 'Unknown',
              revertedAt: dbTx.revertedAt,
              originalTamperedAmount: dbTx.originalTamperedAmount,
            };
          }
        }
        
        return {
          txId: tx.txId,
          sender: tx.sender,
          receiver: tx.receiver,
          amount: tx.amount,
          dbAmount: dbAmount,
          status: dbTx?.revertedBy ? 'reverted' : (tampered ? 'tampered' : 'verified'),
          timestamp: tx.timestamp,
          tampered,
          modificationInfo,
        };
      });
      
      return {
        index: block.index,
        timestamp: new Date(block.timestamp),
        hash: block.hash,
        hashTruncated: truncateHash(block.hash, 12),
        previousHash: block.previousHash,
        previousHashTruncated: truncateHash(block.previousHash, 12),
        nonce: block.nonce,
        transactionCount: transactions.length,
        transactions: processedTxs,
        hasTamperedTx: processedTxs.some((t: any) => t.tampered && !t.modificationInfo?.reverted),
      };
    });

    // Count tampered transactions (not yet reverted)
    const tamperedTxCount = blocks.reduce((acc, block) => 
      acc + block.transactions.filter((t: any) => t.tampered && !t.modificationInfo?.reverted).length, 0
    );
    
    // Count reverted transactions
    const revertedTxCount = blocks.reduce((acc, block) => 
      acc + block.transactions.filter((t: any) => t.modificationInfo?.reverted).length, 0
    );

    // Get user statistics
    const users = await User.find({ role: 'user' }).select('username balance');
    const totalTransactions = blocks.reduce(
      (acc, block) => acc + block.transactionCount,
      0
    );
    
    // Get database info for display
    const mongoUri = process.env.MONGODB_URI || '';
    const dbUserMatch = mongoUri.match(/\/\/([^:]+):/);
    const dbUsername = dbUserMatch ? dbUserMatch[1] : 'unknown';

    return NextResponse.json({
      blocks,
      stats: {
        totalBlocks: blocks.length,
        totalTransactions,
        tamperedTxCount,
        revertedTxCount,
        users: users.map((u) => ({ username: u.username, balance: u.balance })),
        chainValid: validation.valid,
        tamperingDetected: tampering.tampered || tamperedTxCount > 0,
        tamperingDetails: tampering.details,
        storage: 'local-file',
        filePath: 'data/blockchain.json',
        dbConnection: {
          username: dbUsername,
          host: mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger' },
      { status: 500 }
    );
  }
}
