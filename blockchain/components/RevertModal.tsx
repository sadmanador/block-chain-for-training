'use client';

import { useState } from 'react';

interface RevertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: {
    txId: string;
    sender: string;
    receiver: string;
    amount: number;
    dbAmount: number;
    modificationInfo?: {
      type: string;
      dbUsername?: string;
      message?: string;
    };
  } | null;
  isLoading: boolean;
}

export default function RevertModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  transaction, 
  isLoading 
}: RevertModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Revert Tampered Transaction</h3>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300 text-sm mb-2">
              <span className="font-bold">Transaction ID:</span> {transaction.txId}
            </p>
            <p className="text-gray-300 text-sm">
              {transaction.sender} → {transaction.receiver}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-xs uppercase tracking-wider mb-1">Database (Tampered)</p>
              <p className="text-2xl font-bold text-red-400">{transaction.dbAmount} VC</p>
            </div>
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
              <p className="text-green-400 text-xs uppercase tracking-wider mb-1">Blockchain (Original)</p>
              <p className="text-2xl font-bold text-green-400">{transaction.amount} VC</p>
            </div>
          </div>

          {transaction.modificationInfo && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Modification Source Detected:</p>
              {transaction.modificationInfo.type === 'database' ? (
                <>
                  <p className="text-yellow-300 text-sm">
                    {transaction.modificationInfo.message}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Database User: <span className="font-mono text-yellow-400">{transaction.modificationInfo.dbUsername}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    This indicates direct database access outside the application.
                  </p>
                </>
              ) : (
                <p className="text-yellow-300 text-sm">
                  Modified by user through application
                </p>
              )}
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              <span className="font-bold">Action:</span> Reverting will:
            </p>
            <ul className="text-blue-400 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>Restore the original amount from blockchain</li>
              <li>Adjust user balances accordingly</li>
              <li>Mark transaction as &quot;reverted&quot;</li>
              <li>Create an audit trail</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Reverting...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Revert to Blockchain
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
