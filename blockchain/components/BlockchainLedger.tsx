'use client';

interface Block {
  index: number;
  timestamp: string;
  hash: string;
  hashTruncated: string;
  previousHash: string;
  previousHashTruncated: string;
  nonce: number;
  fabricTxId?: string;
  transactionCount: number;
  hasTamperedTx?: boolean;
  transactions: {
    txId: string;
    sender: string;
    receiver: string;
    amount: number;
    dbAmount?: number;
    status: string;
    timestamp: string;
    tampered?: boolean;
  }[];
}

interface BlockchainLedgerProps {
  blocks: Block[];
}

import BlockCard from './BlockCard';

export default function BlockchainLedger({ blocks }: BlockchainLedgerProps) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No blocks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {blocks.map((block, index) => (
        <BlockCard
          key={block.index}
          block={block}
          isLast={index === blocks.length - 1}
        />
      ))}
    </div>
  );
}
