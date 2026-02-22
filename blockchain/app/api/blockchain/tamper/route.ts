import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import localBlockchain from '@/lib/localBlockchain';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Tampering demo not allowed in production' },
        { status: 403 }
      );
    }

    const { blockIndex, newAmount } = await request.json();

    if (typeof blockIndex !== 'number' || typeof newAmount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    await localBlockchain.init();
    await localBlockchain.simulateTampering(blockIndex, newAmount);

    return NextResponse.json({
      success: true,
      message: `Simulated tampering on block ${blockIndex} - changed amount to ${newAmount}`,
      warning: 'Blockchain validation should now fail!',
    });
  } catch (error) {
    console.error('Error simulating tampering:', error);
    return NextResponse.json(
      { error: 'Failed to simulate tampering' },
      { status: 500 }
    );
  }
}
