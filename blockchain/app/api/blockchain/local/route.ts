import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import localBlockchain from '@/lib/localBlockchain';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await localBlockchain.init();
    const chain = await localBlockchain.getChain();
    const validation = await localBlockchain.validateChain();
    const tampering = await localBlockchain.detectTampering();

    return NextResponse.json({
      chain: chain.map(block => ({
        index: block.index,
        timestamp: new Date(block.timestamp).toISOString(),
        hash: block.hash,
        hashTruncated: `${block.hash.substring(0, 16)}...${block.hash.substring(block.hash.length - 16)}`,
        previousHash: block.previousHash,
        previousHashTruncated: block.previousHash === '0' 
          ? '0' 
          : `${block.previousHash.substring(0, 16)}...${block.previousHash.substring(block.previousHash.length - 16)}`,
        nonce: block.nonce,
        transactionCount: JSON.parse(block.transactions).length,
      })),
      validation,
      tampering,
      blockCount: chain.length,
    });
  } catch (error) {
    console.error('Error fetching local blockchain:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blockchain' },
      { status: 500 }
    );
  }
}
