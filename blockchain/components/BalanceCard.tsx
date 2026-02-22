'use client';

import { useState, useEffect } from 'react';

interface BalanceCardProps {
  refreshTrigger?: number;
}

export default function BalanceCard({ refreshTrigger = 0 }: BalanceCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, [refreshTrigger]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/transactions/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700 p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
      
      <div className="relative">
        <p className="text-gray-400 text-sm font-medium mb-1">Current Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">
            {balance?.toLocaleString()}
          </span>
          <span className="text-gray-500 font-medium">VC</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Welcome back, {username}</p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
        <svg
          className="h-4 w-4 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Active account</span>
      </div>
    </div>
  );
}
