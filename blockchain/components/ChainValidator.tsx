'use client';

import { useState, useEffect } from 'react';

export default function ChainValidator() {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [tamperingDetails, setTamperingDetails] = useState<string[]>([]);
  const [blockCount, setBlockCount] = useState(0);
  const [storage, setStorage] = useState('');

  const verifyChain = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/blockchain/verify');
      if (response.ok) {
        const data = await response.json();
        setIsValid(data.valid);
        setTamperingDetails(data.tamperingDetails || []);
        setBlockCount(data.totalBlocks);
        setStorage(data.source);
      }
    } catch (error) {
      console.error('Error verifying chain:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    verifyChain();
    // Check every 5 seconds for faster detection
    const interval = setInterval(verifyChain, 5000);
    return () => clearInterval(interval);
  }, []);

  const simulateTampering = async () => {
    if (blockCount <= 1) {
      alert('Need at least one transaction block to tamper with!');
      return;
    }
    
    const blockIndex = prompt(`Enter block index to tamper (1-${blockCount-1}):`, '1');
    const newAmount = prompt('Enter new amount:', '9999');
    
    if (blockIndex && newAmount) {
      try {
        const response = await fetch('/api/blockchain/tamper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            blockIndex: parseInt(blockIndex), 
            newAmount: parseInt(newAmount) 
          }),
        });
        
        if (response.ok) {
          alert('Tampering simulated! Check the dashboard in a few seconds...');
          verifyChain();
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  if (isValid === null) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-400 text-sm">Verifying local blockchain...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border ${isValid ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isValid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {isValid ? (
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <p className={`font-medium ${isValid ? 'text-green-400' : 'text-red-400'}`}>
              {isValid ? 'Local Blockchain Valid' : 'TAMPERING DETECTED!'}
            </p>
            <p className="text-xs text-gray-400">
              {storage && `Storage: ${storage} • `}
              {blockCount} blocks • 
              {isValid 
                ? ' All hashes verified - integrity intact' 
                : ' Data integrity compromised!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={verifyChain}
            disabled={checking}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {checking ? '...' : 'Verify'}
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={simulateTampering}
              className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-sm rounded-lg transition-colors"
              title="Demo: Simulate tampering"
            >
              Test Tamper
            </button>
          )}
        </div>
      </div>
      
      {tamperingDetails.length > 0 && (
        <div className="mt-3 p-3 bg-red-950/50 rounded-lg border border-red-800">
          <p className="text-red-300 text-sm font-medium mb-2">Tampering Details:</p>
          <ul className="text-red-400 text-xs space-y-1">
            {tamperingDetails.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
