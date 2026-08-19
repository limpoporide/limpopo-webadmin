'use client';

import { useState } from 'react';
import { Receipt, TrendingUp, Calendar, DollarSign, X, Download, Search, Filter } from 'lucide-react';

type Transaction = {
  id: number;
  date: string;
  transactionId: string;
  customerName: string;
  bookingType: string;
  amount: string;
  pickup: string;
  dropoff: string;
  vehicleType: string;
  paymentMethod: string;
  status: string;
};

const sampleTransactions: Transaction[] = [
  {
    id: 1,
    date: '2026-08-19',
    transactionId: 'TXN001234',
    customerName: 'John Doe',
    bookingType: 'Airport Pickup',
    amount: '₦8,500',
    pickup: 'Lagos MM1',
    dropoff: 'Victoria Island',
    vehicleType: 'Limpopo Pro',
    paymentMethod: 'Card',
    status: 'Completed',
  },
  {
    id: 2,
    date: '2026-08-18',
    transactionId: 'TXN001235',
    customerName: 'Jane Smith',
    bookingType: 'Open Pickup',
    amount: '₦12,000',
    pickup: 'Lagos MM2',
    dropoff: 'Lekki Phase 1',
    vehicleType: 'Limpopo Pro-Max (SUV)',
    paymentMethod: 'Transfer',
    status: 'Completed',
  },
  {
    id: 3,
    date: '2026-08-17',
    transactionId: 'TXN001236',
    customerName: 'Ahmed Ibrahim',
    bookingType: 'Hiring',
    amount: '₦6,500',
    pickup: 'Ikeja GRA',
    dropoff: 'Surulere',
    vehicleType: 'Limpopo Pro',
    paymentMethod: 'Cash',
    status: 'Completed',
  },
];

export default function TransactionsPage() {
  const [transactions] = useState<Transaction[]>(sampleTransactions);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  
  const [dateFilter, setDateFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [txnIdFilter, setTxnIdFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');

  const filteredTransactions = transactions.filter((txn) => {
    const matchesDate = dateFilter === '' || txn.date.includes(dateFilter);
    const matchesName = nameFilter === '' || txn.customerName.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesTxnId = txnIdFilter === '' || txn.transactionId.toLowerCase().includes(txnIdFilter.toLowerCase());
    const matchesBookingType = bookingTypeFilter === '' || txn.bookingType === bookingTypeFilter;
    
    return matchesDate && matchesName && matchesTxnId && matchesBookingType;
  });

  const totalDaily = '₦27,000';
  const totalWeekly = '₦189,000';
  const totalMonthly = '₦756,000';

  const handleViewDetails = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setShowModal(true);
    setShowReceipt(false);
  };

  const handleViewReceipt = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setShowReceipt(true);
    setShowModal(false);
  };

  const handleDownloadReceipt = () => {
    alert('Receipt downloaded successfully!');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowReceipt(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt size={28} className="text-green-600 dark:text-green-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transactions
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Daily</h3>
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{totalDaily}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Total Weekly</h3>
              <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{totalWeekly}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Total Monthly</h3>
              <DollarSign size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{totalMonthly}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search by name"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={txnIdFilter}
                  onChange={(e) => setTxnIdFilter(e.target.value)}
                  placeholder="Search by ID"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Booking Type</label>
              <select
                value={bookingTypeFilter}
                onChange={(e) => setBookingTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              >
                <option value="">All Types</option>
                <option value="Airport Pickup">Airport Pickup</option>
                <option value="Open Pickup">Open Pickup</option>
                <option value="Hiring">Hiring</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Booking Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((txn, index) => (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{txn.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{txn.transactionId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{txn.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{txn.bookingType}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{txn.amount}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleViewDetails(txn)}
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleViewReceipt(txn)}
                        className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No transactions found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</h2>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-green-600"></div>
                  Transaction Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction ID</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.transactionId}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.date}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Customer Name</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.customerName}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Booking Type</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.bookingType}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-green-600"></div>
                  Trip Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pick-up</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.pickup}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Drop-off</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.dropoff}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Vehicle Type</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.vehicleType}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{selectedTransaction.status}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-green-600"></div>
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payment Method</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-900/40">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1">Amount</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedTransaction.amount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Receipt</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReceipt}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2"
                >
                  <Download size={16} />
                  Download
                </button>
                <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">LIMPOPO</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ride-Hailing Service</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Official Receipt</p>
                </div>
                <div className="border-t-2 border-b-2 border-gray-300 dark:border-gray-600 py-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Receipt No:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.transactionId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-400">Date:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.date}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Service:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.bookingType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">From:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.pickup}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">To:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.dropoff}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.vehicleType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTransaction.paymentMethod}</span>
                  </div>
                </div>
                <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedTransaction.amount}</span>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-500">Thank you for choosing Limpopo!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">For support: support@limpopo.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
