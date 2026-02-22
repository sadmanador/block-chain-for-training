'use client';

import { useState } from 'react';
import BalanceCard from '@/components/BalanceCard';
import TransferForm from '@/components/TransferForm';
import TransactionHistory from '@/components/TransactionHistory';
import ChainValidator from '@/components/ChainValidator';

export default function DashboardPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransferComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <ChainValidator />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BalanceCard refreshTrigger={refreshTrigger} />
        <TransferForm onTransferComplete={handleTransferComplete} />
      </div>

      <TransactionHistory refreshTrigger={refreshTrigger} />
    </div>
  );
}
