import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import localBlockchain from '@/lib/localBlockchain';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await localBlockchain.init();
    const raw = await localBlockchain.getRawFile();

    return NextResponse.json({ raw });
  } catch (error) {
    console.error('Error reading blockchain file:', error);
    return NextResponse.json({ error: 'Failed to read blockchain file' }, { status: 500 });
  }
}
