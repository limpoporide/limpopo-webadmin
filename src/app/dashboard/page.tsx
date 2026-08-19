'use client';

import QuickBookings from '@/components/QuickBookings';
import {
  Calendar,
  DollarSign,
  Car,
  TrendingUp,
  Users,
  BarChart3,
} from 'lucide-react';

export default function DashboardOverview() {
  const stats = [
    {
      title: 'Total Bookings',
      value: '1,234',
      change: '+12.5%',
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Transactions',
      value: '₦45,678',
      change: '+8.2%',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Total Available Drivers',
      value: '89',
      change: '+3.1%',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Driver Enroute',
      value: '42',
      change: '+15.7%',
      icon: Car,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Admin 👋
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="col-span-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 hover:shadow-lg transition"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} p-3 rounded-lg`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <span className="text-green-600 dark:text-green-400 text-sm font-semibold">
                        {stat.change}
                      </span>
                    </div>
                    <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      {stat.title}
                    </h3>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                );
            })}
          </div>

          {/* Statistics Containers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            {/* Revenue Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp
                    size={20}
                    className="text-green-600 dark:text-green-400"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Revenue Trends
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      This Week
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₦12,450
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Last Week
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₦10,230
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                </div>
              </div>

            {/* Driver Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Car
                    size={20}
                    className="text-purple-600 dark:text-purple-400"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Driver Performance
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Average Rating
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        4.8/5.0
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: '96%' }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Completion Rate
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        92%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: '92%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Booking Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Booking Analytics
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Pending
                    </span>
                    <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                      23
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      In Progress
                    </span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      42
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Completed
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      187
                    </span>
                  </div>
                </div>
              </div>
            </div>

          {/* Quick Bookings - Full Width Below Stats */}
          <div className="col-span-12">
            <QuickBookings />
          </div>
        </div>
      </div>
    </div>
  );
}
