'use client';

import { useState } from 'react';
import { UserCog, Mail, Send, Shield, Ban, CheckCircle, Settings } from 'lucide-react';

type AdminRole = 'sub-admin' | 'support' | 'marketing';

type Admin = {
  id: number;
  email: string;
  role: AdminRole;
  status: 'active' | 'blocked';
  permissions: {
    dashboard: boolean;
    booking: boolean;
    customers: boolean;
    transactions: boolean;
    analytics: boolean;
    settings: boolean;
  };
};

const sampleAdmins: Admin[] = [
  {
    id: 1,
    email: 'subadmin@limpopo.com',
    role: 'sub-admin',
    status: 'active',
    permissions: { dashboard: true, booking: true, customers: true, transactions: true, analytics: true, settings: false },
  },
  {
    id: 2,
    email: 'support@limpopo.com',
    role: 'support',
    status: 'active',
    permissions: { dashboard: true, booking: false, customers: true, transactions: false, analytics: false, settings: false },
  },
  {
    id: 3,
    email: 'marketing@limpopo.com',
    role: 'marketing',
    status: 'blocked',
    permissions: { dashboard: true, booking: false, customers: true, transactions: false, analytics: true, settings: false },
  },
];

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>(sampleAdmins);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('support');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const handleInviteAdmin = () => {
    if (!newEmail || !newEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    alert(`Invitation sent to ${newEmail} as ${newRole}`);
    setNewEmail('');
    setNewRole('support');
  };

  const handleToggleStatus = (adminId: number) => {
    setAdmins(admins.map(admin => 
      admin.id === adminId 
        ? { ...admin, status: admin.status === 'active' ? 'blocked' : 'active' }
        : admin
    ));
  };

  const handleManagePermissions = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowPermissions(true);
  };

  const handleTogglePermission = (menuItem: keyof Admin['permissions']) => {
    if (!selectedAdmin) return;
    setAdmins(admins.map(admin =>
      admin.id === selectedAdmin.id
        ? { ...admin, permissions: { ...admin.permissions, [menuItem]: !admin.permissions[menuItem] } }
        : admin
    ));
    setSelectedAdmin({ ...selectedAdmin, permissions: { ...selectedAdmin.permissions, [menuItem]: !selectedAdmin.permissions[menuItem] } });
  };

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case 'sub-admin': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'support': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'marketing': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <UserCog size={28} className="text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Management (RBAC)
          </h1>
        </div>

        {/* Invite Admin Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite New Admin</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Assignment
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              >
                <option value="sub-admin">Sub-Admin</option>
                <option value="support">Support</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                onClick={handleInviteAdmin}
                className="w-full px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Send Invite
              </button>
            </div>
          </div>
        </div>

        {/* Admin List Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Admins</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {admins.map((admin, index) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{admin.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(admin.role)}`}>
                        {admin.role.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`flex items-center gap-1 text-xs font-medium ${
                        admin.status === 'active'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {admin.status === 'active' ? <CheckCircle size={14} /> : <Ban size={14} />}
                        {admin.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleToggleStatus(admin.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                          admin.status === 'active'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {admin.status === 'active' ? 'Block' : 'Unblock'}
                      </button>
                      <button
                        onClick={() => handleManagePermissions(admin)}
                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                      >
                        Permissions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissions && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu Access</h2>
              </div>
              <button onClick={() => setShowPermissions(false)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedAdmin.email} - {selectedAdmin.role.replace('-', ' ').toUpperCase()}
              </p>
              <div className="space-y-3">
                {Object.entries(selectedAdmin.permissions).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{key}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => handleTogglePermission(key as keyof Admin['permissions'])}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={() => setShowPermissions(false)}
                className="w-full mt-6 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
