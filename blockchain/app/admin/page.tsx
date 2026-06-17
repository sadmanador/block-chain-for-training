'use client';

import { useState, useEffect } from 'react';
import BlockchainLedger from '@/components/BlockchainLedger';
import RevertModal from '@/components/RevertModal';

interface Block {
  index: number;
  timestamp: string;
  hash: string;
  hashTruncated: string;
  previousHash: string;
  previousHashTruncated: string;
  nonce: number;
  transactionCount: number;
  transactions: {
    txId: string;
    sender: string;
    receiver: string;
    amount: number;
    dbAmount?: number;
    status: string;
    timestamp: string;
    tampered?: boolean;
    modificationInfo?: {
      type: string;
      dbUsername?: string;
      message?: string;
      reverted?: boolean;
      revertedBy?: string;
      revertedAt?: string;
      originalTamperedAmount?: number;
    };
  }[];
  hasTamperedTx?: boolean;
}

interface Stats {
  totalBlocks: number;
  totalTransactions: number;
  tamperedTxCount: number;
  revertedTxCount: number;
  users: { username: string; balance: number; expectedBalance: number | null; balanceTampered: boolean }[];
  chainValid: boolean;
  tamperingDetected: boolean;
  tamperingDetails: string[];
  balanceTampering: { username: string; dbBalance: number; expectedBalance: number; difference: number }[];
  storage: string;
  filePath: string;
  dbConnection: {
    username: string;
    host: string;
  };
}

export default function AdminPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [revertLoading, setRevertLoading] = useState(false);
  const [healLoading, setHealLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);


  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRawBlockchain = async () => {
    setRawLoading(true);
    try {
      const res = await fetch('/api/admin/blockchain-raw');
      if (res.ok) {
        const data = await res.json();
        setRawJson(data.raw);
        setRawExpanded(true);
      }
    } catch (error) {
      console.error('Error fetching raw blockchain:', error);
    } finally {
      setRawLoading(false);
    }
  };

  const fetchLedger = async () => {
    try {
      const response = await fetch('/api/admin/ledger');
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertClick = (tx: any) => {
    setSelectedTx(tx);
    setModalOpen(true);
  };

  const handleRevertConfirm = async () => {
    if (!selectedTx) return;
    
    setRevertLoading(true);
    try {
      const response = await fetch('/api/admin/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId: selectedTx.txId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Transaction reverted successfully!\n\nOld amount: ${data.transaction.oldAmount} VC\nNew amount: ${data.transaction.newAmount} VC\nDifference: ${data.transaction.difference} VC`);
        setModalOpen(false);
        fetchLedger(); // Refresh the data
      } else {
        const error = await response.json();
        alert(`❌ Failed to revert: ${error.error}`);
      }
    } catch (error) {
      console.error('Error reverting:', error);
      alert('❌ Failed to revert transaction');
    } finally {
      setRevertLoading(false);
    }
  };

  const handleHeal = async () => {
    if (!confirm('Are you sure you want to heal the database? This will restore all tampered transactions AND balances to match the blockchain records.')) return;

    setHealLoading(true);
    try {
      const response = await fetch('/api/admin/heal', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        let msg = `✅ ${data.message}`;
        if (data.balanceChanges?.length > 0) {
          msg += '\n\nBalance corrections:';
          for (const c of data.balanceChanges) {
            msg += `\n  ${c.username}: ${c.oldBalance} VC → ${c.newBalance} VC`;
          }
        }
        alert(msg);
        fetchLedger();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Heal error:', error);
      alert('❌ Failed to heal database');
    } finally {
      setHealLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('CRITICAL: Are you sure you want to restore the system? This will CLEAR ALL TRANSACTIONS, reset the blockchain, and set user balances to 5000 VC. THIS ACTION CANNOT BE UNDONE.')) return;
    
    setRestoreLoading(true);
    try {
      const response = await fetch('/api/admin/restore', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        alert(`✅ ${data.message}`);
        fetchLedger();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('❌ Failed to restore system');
    } finally {
      setRestoreLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-800 rounded-2xl"></div>
          <div className="h-96 bg-gray-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revert Modal */}
      <RevertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleRevertConfirm}
        transaction={selectedTx}
        isLoading={revertLoading}
      />

      {/* Transaction Tampering Alert */}
      {stats?.tamperingDetected && stats.tamperedTxCount > 0 && (
        <div className="bg-red-900/30 border-2 border-red-500 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-400">⚠️ CRITICAL: TRANSACTION TAMPERING DETECTED</h3>
              <p className="text-red-300 mt-1">
                The database has been modified and does not match the blockchain records.
                <span className="font-bold"> {stats.tamperedTxCount} transaction(s) need to be reverted.</span>
              </p>
              {stats.dbConnection && (
                <p className="text-yellow-400 text-sm mt-2">
                  Database Connection: {stats.dbConnection.host} (User: {stats.dbConnection.username})
                </p>
              )}
              {stats.tamperingDetails.length > 0 && (
                <div className="mt-3 p-3 bg-red-950/50 rounded border border-red-800">
                  <p className="text-red-400 text-sm font-medium">Details:</p>
                  <ul className="text-red-400 text-xs mt-1 space-y-1">
                    {stats.tamperingDetails.map((detail, i) => (
                      <li key={i}>• {detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Balance Tampering Alert */}
      {stats?.balanceTampering && stats.balanceTampering.length > 0 && (
        <div className="bg-orange-900/30 border-2 border-orange-500 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-orange-400">⚠️ CRITICAL: BALANCE TAMPERING DETECTED</h3>
              <p className="text-orange-300 mt-1">
                User balance(s) in the database do not match what the blockchain ledger predicts.
                Someone may have edited balances directly in MongoDB without going through transactions.
              </p>
              <div className="mt-3 space-y-2">
                {stats.balanceTampering.map((b) => (
                  <div key={b.username} className="p-3 bg-orange-950/50 rounded border border-orange-800">
                    <p className="text-orange-200 font-medium">{b.username}</p>
                    <p className="text-red-400 text-sm">
                      Database balance: <span className="line-through font-bold">{b.dbBalance} VC</span>
                    </p>
                    <p className="text-green-400 text-sm">
                      Blockchain-expected: <span className="font-bold">{b.expectedBalance} VC</span>
                    </p>
                    <p className="text-yellow-400 text-xs mt-1">
                      Discrepancy: {b.difference > 0 ? '+' : ''}{b.difference} VC
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Controls</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleHeal}
            disabled={healLoading || !stats?.tamperingDetected}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              healLoading || !stats?.tamperingDetected
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20'
            }`}
          >
            {healLoading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            Heal Database
          </button>

          <button
            onClick={handleRestore}
            disabled={restoreLoading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              restoreLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20'
            }`}
          >
            {restoreLoading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Restore System
          </button>
        </div>
        <p className="text-gray-400 text-xs mt-4">
          <span className="text-green-500 font-bold">Heal:</span> Fixes all tampered records using blockchain data.
          <span className="text-red-500 font-bold ml-4">Restore:</span> Resets everything to initial state (balances: 5000 VC).
        </p>
      </div>


      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Blocks</p>
            <p className="text-3xl font-bold text-white">{stats.totalBlocks}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Transactions</p>
            <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
          </div>
          <div className={`rounded-xl p-6 border ${stats.chainValid ? 'bg-gray-800 border-gray-700' : 'bg-red-900/20 border-red-500'}`}>
            <p className="text-gray-400 text-sm">Chain Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`h-3 w-3 rounded-full ${
                  stats.chainValid ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <p
                className={`text-lg font-medium ${
                  stats.chainValid ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stats.chainValid ? 'Valid' : 'Invalid'}
              </p>
            </div>
          </div>
          <div className={`rounded-xl p-6 border ${stats.tamperedTxCount === 0 ? 'bg-gray-800 border-gray-700' : 'bg-red-900/20 border-red-500'}`}>
            <p className="text-gray-400 text-sm">Tampered</p>
            <p className={`text-3xl font-bold ${stats.tamperedTxCount === 0 ? 'text-white' : 'text-red-400'}`}>
              {stats.tamperedTxCount}
            </p>
          </div>
          <div className={`rounded-xl p-6 border ${stats.revertedTxCount === 0 ? 'bg-gray-800 border-gray-700' : 'bg-blue-900/20 border-blue-500'}`}>
            <p className="text-gray-400 text-sm">Reverted</p>
            <p className={`text-3xl font-bold ${stats.revertedTxCount === 0 ? 'text-white' : 'text-blue-400'}`}>
              {stats.revertedTxCount}
            </p>
          </div>
        </div>
      )}

      {/* Storage Info */}
      {stats && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Storage Location</p>
              <p className="text-white font-medium">{stats.filePath}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Storage Type</p>
              <p className="text-green-400 font-medium">Local File (Immutable)</p>
            </div>
            {stats.dbConnection && (
              <div className="text-right">
                <p className="text-gray-400 text-sm">Database</p>
                <p className="text-blue-400 font-medium">{stats.dbConnection.host}</p>
                <p className="text-gray-500 text-xs">User: {stats.dbConnection.username}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Balances */}
      {stats && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-1">User Balances</h3>
          <p className="text-gray-500 text-xs mb-4">
            Expected balance is computed from the blockchain ledger (initial balance + all confirmed transactions).
            A mismatch means the balance field was edited directly in the database.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.users.map((user) => (
              <div
                key={user.username}
                className={`rounded-lg p-4 border ${
                  user.balanceTampered
                    ? 'bg-orange-900/20 border-orange-500'
                    : 'bg-gray-700/50 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-gray-300 font-medium">{user.username}</span>
                    {user.balanceTampered && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded animate-pulse">
                        TAMPERED
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {user.balanceTampered ? (
                      <>
                        <p className="text-red-400 text-sm line-through">{user.balance} VC</p>
                        <p className="text-green-400 text-sm font-bold">
                          Expected: {user.expectedBalance} VC
                        </p>
                      </>
                    ) : (
                      <span className="text-white font-medium">{user.balance} VC</span>
                    )}
                  </div>
                </div>
                {user.expectedBalance !== null && !user.balanceTampered && (
                  <p className="text-gray-500 text-xs mt-1">
                    Blockchain expected: {user.expectedBalance} VC ✓
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw blockchain.json Viewer */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Raw Blockchain File</h3>
            <p className="text-gray-500 text-xs mt-0.5">data/blockchain.json — the immutable source of truth on disk</p>
          </div>
          <div className="flex items-center gap-3">
            {rawJson && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawJson);
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
              >
                Copy
              </button>
            )}
            <button
              onClick={rawExpanded && rawJson ? () => setRawExpanded(false) : fetchRawBlockchain}
              disabled={rawLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {rawLoading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : rawExpanded ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {rawExpanded ? 'Collapse' : 'Show File'}
            </button>
          </div>
        </div>
        {rawExpanded && rawJson && (
          <div className="relative">
            <div className="absolute top-3 right-4 text-gray-600 text-xs font-mono">blockchain.json</div>
            <pre className="p-6 overflow-x-auto overflow-y-auto max-h-[600px] text-xs font-mono leading-relaxed">
              <RawJsonHighlight json={rawJson} />
            </pre>
          </div>
        )}
      </div>

      {/* Blockchain Ledger with Revert Buttons */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Blockchain Ledger</h2>
        <p className="text-gray-400 text-sm mb-4">
          Blocks with red borders contain tampered transactions. 
          Click &quot;Revert&quot; to restore the original blockchain values.
        </p>
        
        {blocks.map((block, index) => (
          <div key={block.index} className="mb-8">
            <BlockCard 
              block={block} 
              isLast={index === blocks.length - 1} 
              onRevert={handleRevertClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function RawJsonHighlight({ json }: { json: string }) {
  const lines = json.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        // Colour-code JSON tokens for readability
        const highlighted = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          // String values
          .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span style="color:#7dd3fc">$1</span>$2')
          .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span style="color:#86efac">$1</span>')
          // Numbers
          .replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span style="color:#fcd34d">$1</span>')
          // Booleans / null
          .replace(/:\s*(true|false|null)/g, ': <span style="color:#f9a8d4">$1</span>')
          // Brackets
          .replace(/([{}\[\]])/g, '<span style="color:#94a3b8">$1</span>');
        return (
          <div key={i} className="flex">
            <span className="select-none text-gray-600 w-8 shrink-0 text-right pr-4">{i + 1}</span>
            <span dangerouslySetInnerHTML={{ __html: highlighted }} />
          </div>
        );
      })}
    </>
  );
}

// BlockCard component with revert button
interface BlockCardProps {
  block: Block;
  isLast: boolean;
  onRevert: (tx: any) => void;
}

function BlockCard({ block, isLast, onRevert }: BlockCardProps) {
  const isGenesis = block.index === 0;
  const hasTampered = block.transactions.some(tx => tx.tampered && !tx.modificationInfo?.reverted);

  return (
    <div className="relative">
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-1/2 -bottom-8 w-0.5 h-8 bg-gradient-to-b from-gray-600 to-gray-700"></div>
      )}

      <div className={`bg-gray-800 rounded-xl border-2 overflow-hidden ${
        hasTampered ? 'border-red-500' : 'border-gray-700'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b flex justify-between items-center ${
          hasTampered ? 'bg-red-900/30 border-red-800' : 'bg-gray-700 border-gray-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">Block #{block.index}</span>
            {isGenesis && (
              <span className="px-2 py-0.5 text-xs bg-purple-900 text-purple-200 rounded">Genesis</span>
            )}
            {hasTampered && (
              <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded animate-pulse">
                ⚠️ TAMPERED
              </span>
            )}
          </div>
          <span className="text-sm text-gray-400">{block.transactionCount} transaction(s)</span>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase">Hash</p>
              <p className="font-mono text-green-400">{block.hashTruncated}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase">Previous Hash</p>
              <p className="font-mono text-blue-400">{block.previousHashTruncated}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase">Timestamp</p>
              <p className="text-gray-300">{new Date(block.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase">Nonce</p>
              <p className="text-gray-300">{block.nonce}</p>
            </div>
          </div>

          {/* Transactions */}
          {block.transactions.length > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-500 text-xs uppercase mb-3">Transactions</p>
              <div className="space-y-3">
                {block.transactions.map((tx, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg ${
                      tx.tampered && !tx.modificationInfo?.reverted
                        ? 'bg-red-900/30 border border-red-600' 
                        : tx.modificationInfo?.reverted
                        ? 'bg-blue-900/30 border border-blue-600'
                        : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">{tx.sender} → {tx.receiver}</p>
                        <p className="text-gray-500 text-xs">{new Date(tx.timestamp).toLocaleString()}</p>
                        
                        {tx.tampered && !tx.modificationInfo?.reverted && (
                          <div className="mt-2 space-y-1">
                            <p className="text-red-400 text-xs">
                              Database: <span className="line-through font-bold">{tx.dbAmount} VC</span>
                            </p>
                            <p className="text-green-400 text-xs">
                              Blockchain: <span className="font-bold">{tx.amount} VC</span>
                            </p>
                            {tx.modificationInfo?.dbUsername && (
                              <p className="text-yellow-400 text-xs">
                                Modified by DB User: {tx.modificationInfo.dbUsername}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {tx.modificationInfo?.reverted && (
                          <div className="mt-2 space-y-1">
                            <p className="text-green-400 text-xs">
                              ✓ Reverted to: {tx.amount} VC
                            </p>
                            <p className="text-blue-400 text-xs">
                              by {tx.modificationInfo.revertedBy} at {new Date(tx.modificationInfo.revertedAt!).toLocaleString()}
                            </p>
                            {tx.modificationInfo.originalTamperedAmount && (
                              <p className="text-red-400 text-xs">
                                Original tampered amount: {tx.modificationInfo.originalTamperedAmount} VC
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {tx.tampered && !tx.modificationInfo?.reverted ? (
                          <button
                            onClick={() => onRevert(tx)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            Revert
                          </button>
                        ) : tx.modificationInfo?.reverted ? (
                          <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded">
                            Reverted
                          </span>
                        ) : (
                          <span className="text-white font-medium">{tx.amount} VC</span>
                        )}
                      </div>
                    </div>
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
