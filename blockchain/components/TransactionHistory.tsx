'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  _id: string;
  txId: string;
  sender: { username: string };
  receiver: { username: string };
  amount: number;
  status: string;
  timestamp: string;
  tampered?: boolean;
  originalAmount?: number;
  blockchainVerified?: boolean;
}

interface TransactionHistoryProps {
  refreshTrigger?: number;
}

export default function TransactionHistory({ refreshTrigger = 0 }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tamperingDetected, setTamperingDetected] = useState(false);
  const [tamperedCount, setTamperedCount] = useState(0);
  const [showTamperAlert, setShowTamperAlert] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setTamperingDetected(data.tamperingDetected);
        setTamperedCount(data.tamperedCount);
        
        if (data.tamperingDetected) {
          setShowTamperAlert(true);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Transaction History</h2>
        
        {tamperingDetected && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-900/50 border border-red-500 rounded-lg">
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-400 text-sm font-medium">
              {tamperedCount} tampered
            </span>
          </div>
        )}
      </div>

      {showTamperAlert && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-300 font-medium">⚠️ DATA TAMPERING DETECTED!</p>
              <p className="text-red-400 text-sm mt-1">
                Some transaction amounts in the database do not match the blockchain records. 
                The highlighted transactions below show discrepancies.
              </p>
              <button 
                onClick={() => setShowTamperAlert(false)}
                className="mt-2 text-red-400 text-xs hover:text-red-300 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={tx._id}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                tx.tampered 
                  ? 'bg-red-900/20 border-red-500 animate-pulse' 
                  : 'bg-gray-700/50 border-transparent'
              }`}
            >
              {tx.tampered && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  TAMPERED!
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-medium ${
                        tx.status === 'confirmed'
                          ? 'text-green-400'
                          : tx.status === 'failed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {formatDate(tx.timestamp)}
                    </span>
                    {!tx.blockchainVerified && (
                      <span className="text-orange-400 text-xs bg-orange-900/30 px-2 py-0.5 rounded">
                        Not in blockchain
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm">
                    {tx.sender.username} → {tx.receiver.username}
                  </p>
                  
                  {tx.tampered && (
                    <div className="mt-2 p-2 bg-red-950/50 rounded border border-red-800">
                      <p className="text-red-300 text-xs">
                        <span className="font-bold">⚠️ TAMPERING DETECTED:</span>
                      </p>
                      <p className="text-red-400 text-xs mt-1">
                        Database shows: <span className="line-through">{tx.amount} VC</span>
                      </p>
                      <p className="text-green-400 text-xs">
                        Blockchain shows: {tx.originalAmount} VC (VERIFIED)
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <span className={`text-lg font-bold ${tx.tampered ? 'text-red-400 line-through' : 'text-white'}`}>
                    {tx.amount} VC
                  </span>
                  {tx.tampered && (
                    <p className="text-green-400 text-sm font-bold">
                      {tx.originalAmount} VC ✓
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          Transactions are verified against the local blockchain file. 
          Any discrepancies between the database and blockchain are highlighted above.
        </p>
      </div>
    </div>
  );
}
