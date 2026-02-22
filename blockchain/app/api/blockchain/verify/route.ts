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
    
    // Validate the local blockchain
    const validation = await localBlockchain.validateChain();
    const tampering = await localBlockchain.detectTampering();
    
    const chain = await localBlockchain.getChain();

    return NextResponse.json({ 
      valid: validation.valid,
      message: validation.message,
      tamperedBlock: validation.tamperedBlock,
      tamperingDetails: tampering.details,
      totalBlocks: chain.length,
      source: 'local-blockchain-file',
      fileLocation: 'data/blockchain.json',
    });
  } catch (error) {
    console.error('Error validating chain:', error);
    return NextResponse.json(
      { error: 'Failed to validate chain' },
      { status: 500 }
    );
  }
}
