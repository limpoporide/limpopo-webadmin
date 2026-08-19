'use client';

import { useState } from 'react';
import { Users, X, Search, Filter } from 'lucide-react';

type Customer = {
  id: number;
  date: string;
  transactionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pickup: string;
  dropoff: string;
  vehicleType: string;
  amount: string;
  estimatedKm: string;
  eta: string;
  assignedDriver: string;
};

const sampleCustomers: Customer[] = [
  {
    id: 1,
    date: '2026-08-19',
    transactionId: 'TXN001234',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '08012345678',
    pickup: 'Lagos MM1',
    dropoff: 'Victoria Island',
    vehicleType: 'Limpopo Pro',
    amount: '₦8,500',
    estimatedKm: '15',
    eta: '30 mins',
    assignedDriver: 'Driver A',
  },
  {
    id: 2,
    date: '2026-08-18',
    transactionId: 'TXN001235',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '08098765432',
    pickup: 'Lagos MM2',
    dropoff: 'Lekki Phase 1',
    vehicleType: 'Limpopo Pro-Max (SUV)',
    amount: '₦12,000',
    estimatedKm: '22',
    eta: '45 mins',
    assignedDriver: 'Driver B',
  },
  {
    id: 3,
    date: '2026-08-17',
    transactionId: 'TXN001236',
    firstName: 'Ahmed',
    lastName: 'Ibrahim',
    email: 'ahmed.ibrahim@example.com',
    phone: '08123456789',
    pickup: 'Ikeja GRA',
    dropoff: 'Surulere',
    vehicleType: 'Limpopo Pro',
    amount: '₦6,500',
    estimatedKm: '12',
    eta: '25 mins',
    assignedDriver: 'Driver C',
  },
];

export default function CustomersPage() {
  const [customers] = useState<Customer[]>(sampleCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredCustomers = customers.filter((customer) => {
    const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
    const matchesName = nameFilter === '' || fullName.includes(nameFilter.toLowerCase());
    const matchesEmail = emailFilter === '' || customer.email.toLowerCase().includes(emailFilter.toLowerCase());
    const matchesPhone = phoneFilter === '' || customer.phone.includes(phoneFilter);
    const matchesVehicle = vehicleFilter === '' || customer.vehicleType === vehicleFilter;
    
    return matchesName && matchesEmail && matchesPhone && matchesVehicle;
  });

  const handleViewMore = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users size={28} className="text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Customer Management
            </h1>
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search by name"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  placeholder="Search by email"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  placeholder="Search by phone"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle Type
              </label>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              >
                <option value="">All Vehicles</option>
                <option value="Limpopo Pro">Limpopo Pro</option>
                <option value="Limpopo Pro-Max (SUV)">Limpopo Pro-Max (SUV)</option>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    SN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pick-up
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Drop-off
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {customer.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {customer.transactionId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {customer.firstName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {customer.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {customer.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-[150px] truncate" title={customer.pickup}>
                        {customer.pickup}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-[150px] truncate" title={customer.dropoff}>
                        {customer.dropoff}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {customer.vehicleType}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {customer.amount}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <button
                        onClick={() => handleViewMore(customer)}
                        className="px-3 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                      >
                        View More
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No customers found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Customer Details
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Transaction Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-purple-600"></div>
                  Transaction Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction ID</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.transactionId}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.date}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-purple-600"></div>
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">First Name</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.firstName}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Name</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.lastName}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Email</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.email}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Phone Number</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-purple-600"></div>
                  Trip Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pick-up Location</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.pickup}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Drop-off Location</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.dropoff}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Vehicle Type</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.vehicleType}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Estimated KM</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.estimatedKm} km
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ETA</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.eta}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Assigned Driver</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.assignedDriver}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-purple-600"></div>
                  Financial Information
                </h3>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-900/40">
                  <p className="text-xs text-green-700 dark:text-green-400 mb-1">Amount Paid</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {selectedCustomer.amount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
