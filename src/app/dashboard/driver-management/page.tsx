'use client';

import { useState } from 'react';
import { Car, Users, CheckCircle, XCircle } from 'lucide-react';

type Driver = {
  id: number;
  vehicleType: string;
  vehicleEngine: string;
  parkedLocation: string;
  vehicleLocation: string;
  driverAssigned: string;
  driverContact: string;
};

const sampleDrivers: Driver[] = [
  {
    id: 1,
    vehicleType: 'Limpopo Pro',
    vehicleEngine: 'Electric',
    parkedLocation: 'Lagos MM1 Depot',
    vehicleLocation: 'Victoria Island',
    driverAssigned: 'John Adeola',
    driverContact: '08012345678',
  },
  {
    id: 2,
    vehicleType: 'Limpopo Pro-Max',
    vehicleEngine: 'PMS',
    parkedLocation: 'Lagos MM2 Depot',
    vehicleLocation: 'Lekki Phase 1',
    driverAssigned: 'Ahmed Yusuf',
    driverContact: '08098765432',
  },
  {
    id: 3,
    vehicleType: 'Limpopo Pro',
    vehicleEngine: 'Electric',
    parkedLocation: 'Ikeja Depot',
    vehicleLocation: 'Ikeja GRA',
    driverAssigned: 'Unassigned',
    driverContact: 'N/A',
  },
  {
    id: 4,
    vehicleType: 'Limpopo Pro-Max',
    vehicleEngine: 'PMS',
    parkedLocation: 'Lagos MM1 Depot',
    vehicleLocation: 'Surulere',
    driverAssigned: 'Chioma Nwosu',
    driverContact: '08123456789',
  },
  {
    id: 5,
    vehicleType: 'Limpopo Pro',
    vehicleEngine: 'Electric',
    parkedLocation: 'Yaba Depot',
    vehicleLocation: 'Yaba',
    driverAssigned: 'Unassigned',
    driverContact: 'N/A',
  },
];

export default function DriverManagementPage() {
  const [drivers] = useState<Driver[]>(sampleDrivers);

  const totalDrivers = drivers.length;
  const vehiclesAssigned = drivers.filter(d => d.driverAssigned !== 'Unassigned').length;
  const vehiclesUnassigned = drivers.filter(d => d.driverAssigned === 'Unassigned').length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Car size={28} className="text-orange-600 dark:text-orange-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Driver Management
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Drivers</h3>
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{totalDrivers}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Vehicles Assigned</h3>
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{vehiclesAssigned}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Vehicles Unassigned</h3>
              <XCircle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-300">{vehiclesUnassigned}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Vehicle Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Vehicle Engine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Parked Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Vehicle Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Driver Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Driver Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {drivers.map((driver, index) => (
                  <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{driver.vehicleType}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        driver.vehicleEngine === 'Electric'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {driver.vehicleEngine}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{driver.parkedLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{driver.vehicleLocation}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-medium ${
                        driver.driverAssigned === 'Unassigned'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.driverAssigned}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{driver.driverContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
