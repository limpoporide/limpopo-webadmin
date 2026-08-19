'use client';

import { Wallet } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Wallet size={28} className="text-green-600 dark:text-green-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Wallet Management
          </h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Wallet and payment management features coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
