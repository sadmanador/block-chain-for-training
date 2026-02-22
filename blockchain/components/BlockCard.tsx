'use client';

interface Transaction {
  txId: string;
  sender: string;
  receiver: string;
  amount: number;
  dbAmount?: number;
  status: string;
  timestamp: string;
  tampered?: boolean;
}

interface BlockCardProps {
  block: {
    index: number;
    timestamp: string;
    hash: string;
    hashTruncated: string;
    previousHash: string;
    previousHashTruncated: string;
    nonce: number;
    transactionCount: number;
    transactions: Transaction[];
    hasTamperedTx?: boolean;
  };
  isLast: boolean;
}

export default function BlockCard({ block, isLast }: BlockCardProps) {
  const isGenesis = block.index === 0;
  const tamperedCount = block.transactions.filter(tx => tx.tampered).length;

  return (
    <div className="relative">
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-1/2 -bottom-8 w-0.5 h-8 bg-gradient-to-b from-gray-600 to-gray-700"></div>
      )}

      <div className={`bg-gray-800 rounded-xl border-2 overflow-hidden transition-all ${
        block.hasTamperedTx ? 'border-red-500 shadow-lg shadow-red-900/20' : 'border-gray-700'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b flex justify-between items-center ${
          block.hasTamperedTx 
            ? 'bg-red-900/30 border-red-800' 
            : 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">
              Block #{block.index}
            </span>
            {isGenesis && (
              <span className="px-2 py-0.5 text-xs bg-purple-900 text-purple-200 rounded">
                Genesis
              </span>
            )}
            {block.hasTamperedTx && (
              <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded animate-pulse">
                ⚠️ TAMPERED
              </span>
            )}
          </div>
          <span className="text-sm text-gray-400">
            {block.transactionCount} transaction{block.transactionCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Hash */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Hash</p>
            <p className="font-mono text-sm text-green-400" title={block.hash}>
              {block.hashTruncated}
            </p>
          </div>

          {/* Previous Hash */}
          {!isGenesis && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Previous Hash
              </p>
              <p className="font-mono text-sm text-blue-400" title={block.previousHash}>
                {block.previousHashTruncated}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Timestamp
            </p>
            <p className="text-sm text-gray-300">
              {new Date(block.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Nonce */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Nonce</p>
            <p className="text-sm text-gray-300">{block.nonce}</p>
          </div>

          {/* Tampered Warning */}
          {block.hasTamperedTx && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-3">
              <p className="text-red-300 text-sm font-medium">
                ⚠️ {tamperedCount} transaction{tamperedCount !== 1 ? 's' : ''} tampered
              </p>
              <p className="text-red-400 text-xs mt-1">
                Database data doesn't match blockchain
              </p>
            </div>
          )}

          {/* Transactions */}
          {block.transactions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Transactions
              </p>
              <div className="space-y-2">
                {block.transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className={`rounded p-2 text-sm ${
                      tx.tampered 
                        ? 'bg-red-900/40 border border-red-600' 
                        : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{tx.sender} → {tx.receiver}</span>
                      <div className="text-right">
                        {tx.tampered ? (
                          <>
                            <span className="text-red-400 line-through">{tx.dbAmount} VC</span>
                            <span className="text-green-400 ml-2 font-bold">{tx.amount} VC ✓</span>
                          </>
                        ) : (
                          <span className="text-white font-medium">{tx.amount} VC</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span
                        className={`text-xs ${
                          tx.tampered
                            ? 'text-red-400 font-bold'
                            : tx.status === 'confirmed'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {tx.tampered ? '⚠️ TAMPERED' : tx.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {tx.tampered && (
                      <div className="mt-2 pt-2 border-t border-red-800">
                        <p className="text-red-400 text-xs">
                          <span className="font-bold">Database:</span> {tx.dbAmount} VC (MODIFIED)
                        </p>
                        <p className="text-green-400 text-xs">
                          <span className="font-bold">Blockchain:</span> {tx.amount} VC (VERIFIED)
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
