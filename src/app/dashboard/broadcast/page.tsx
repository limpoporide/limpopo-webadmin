'use client';

import { useState } from 'react';
import { Radio, Send, Filter, Users, Mail } from 'lucide-react';

export default function BroadcastPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [filterType, setFilterType] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    // Simulate recipient count based on filter
    if (value === 'month') setRecipientCount(450);
    else if (value === 'week') setRecipientCount(125);
    else if (value === 'all') setRecipientCount(1250);
    else setRecipientCount(0);
  };

  const handleSendBroadcast = () => {
    if (!subject || !message || !filterType) {
      alert('Please fill in all fields and select a filter');
      return;
    }
    alert(`Broadcast sent to ${recipientCount} recipients!`);
    setSubject('');
    setMessage('');
    setFilterType('');
    setRecipientCount(0);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Radio size={28} className="text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bulk Email Broadcast
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Filter Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} className="text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Recipients</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleFilterChange('week')}
                  className={`p-4 rounded-lg border-2 transition ${
                    filterType === 'week'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                >
                  <div className="text-center">
                    <Users size={24} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                    <p className="font-semibold text-gray-900 dark:text-white">This Week</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Last 7 days</p>
                  </div>
                </button>
                <button
                  onClick={() => handleFilterChange('month')}
                  className={`p-4 rounded-lg border-2 transition ${
                    filterType === 'month'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                >
                  <div className="text-center">
                    <Users size={24} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                    <p className="font-semibold text-gray-900 dark:text-white">This Month</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Last 30 days</p>
                  </div>
                </button>
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`p-4 rounded-lg border-2 transition ${
                    filterType === 'all'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                >
                  <div className="text-center">
                    <Users size={24} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                    <p className="font-semibold text-gray-900 dark:text-white">All Customers</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Everyone</p>
                  </div>
                </button>
              </div>
              {recipientCount > 0 && (
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    📧 This broadcast will be sent to <span className="font-bold">{recipientCount} customers</span>
                  </p>
                </div>
              )}
            </div>

            {/* Email Composition */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={18} className="text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compose Message</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={10}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Send Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSendBroadcast}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
              >
                <Send size={18} />
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
