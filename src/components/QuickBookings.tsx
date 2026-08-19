'use client';

import { Calendar, Plus } from 'lucide-react';

export default function QuickBookings() {
  const bookings = [
    {
      id: 1,
      customer: 'John Doe',
      pickup: 'Downtown Plaza',
      destination: 'Airport',
      time: '10:30 AM',
      status: 'pending',
    },
    {
      id: 2,
      customer: 'Jane Smith',
      pickup: 'Central Station',
      destination: 'Hotel Royal',
      time: '11:15 AM',
      status: 'confirmed',
    },
    {
      id: 3,
      customer: 'Mike Johnson',
      pickup: 'Mall Center',
      destination: 'Office Park',
      time: '12:00 PM',
      status: 'in-progress',
    },
    {
      id: 4,
      customer: 'Sarah Williams',
      pickup: 'City Hall',
      destination: 'Shopping District',
      time: '1:45 PM',
      status: 'pending',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'confirmed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
          Quick Bookings
        </h3>
        <button className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
          <Plus size={18} />
          <span className="hidden sm:inline text-sm font-medium">New Booking</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition cursor-pointer border border-transparent hover:border-blue-500"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                  {booking.customer}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {booking.time}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="truncate flex items-center gap-1">
                <span className="text-green-600">📍</span>
                {booking.pickup}
              </p>
              <p className="truncate flex items-center gap-1">
                <span className="text-red-600">📍</span>
                {booking.destination}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 md:mt-6 flex justify-center">
        <button className="px-6 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition font-medium">
          View All Bookings →
        </button>
      </div>
    </div>
  );
}
