'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Shield,
  UserCog,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import TablePagination from '@/components/TablePagination';
import { supabase } from '@/lib/supabase';
import type { Database, Tables } from '@/types/database.types';

type AdminProfile = Tables<'admin_profile'>;
type AdminRole = Database['public']['Enums']['admin_role'];

const adminRoles: AdminRole[] = [
  'super-admin',
  'manager',
  'finance',
  'support',
  'marketing',
];

const ADMINS_PER_PAGE = 10;

const formatRole = (role: AdminRole) =>
  role
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Pending';
  }

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getRoleBadgeColor = (role: AdminRole) => {
  switch (role) {
    case 'super-admin':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'manager':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'finance':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'support':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    case 'marketing':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminProfile | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('support');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const isSuperAdmin = currentAdmin?.role === 'super-admin' && currentAdmin.is_active;

  const sortedAdmins = useMemo(
    () =>
      [...admins].sort(
        (first, second) =>
          new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
      ),
    [admins],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [admins.length]);

  const pageStartIndex = (currentPage - 1) * ADMINS_PER_PAGE;
  const paginatedAdmins = sortedAdmins.slice(
    pageStartIndex,
    pageStartIndex + ADMINS_PER_PAGE,
  );

  const loadAdmins = async () => {
    setIsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      notify.error('Please sign in again to manage admins');
      setIsLoading(false);
      return;
    }

    const [currentAdminResult, adminsResult] = await Promise.all([
      supabase.from('admin_profile').select('*').eq('uuid', user.id).limit(2),
      supabase.from('admin_profile').select('*').order('created_at', { ascending: false }),
    ]);

    if (currentAdminResult.error) {
      notify.error(currentAdminResult.error.message);
      setIsLoading(false);
      return;
    }

    if ((currentAdminResult.data?.length ?? 0) > 1) {
      notify.error('Multiple admin profiles are linked to your account. Please clean up duplicate admin records.');
      setIsLoading(false);
      return;
    }

    const activeAdminProfile = currentAdminResult.data?.[0] ?? null;

    if (!activeAdminProfile) {
      notify.error('Could not load your admin profile');
      setIsLoading(false);
      return;
    }

    if (adminsResult.error) {
      notify.error(adminsResult.error.message);
      setIsLoading(false);
      return;
    }

    setCurrentAdmin(activeAdminProfile);
    setAdmins(adminsResult.data ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleInviteAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSuperAdmin) {
      notify.error('Only super-admins can invite new admins');
      return;
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      notify.error('Please enter a valid email address');
      return;
    }

    if (!trimmedFirstName || !trimmedLastName) {
      notify.error('First name and last name are required');
      return;
    }

    setIsInviting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error('Your session expired. Please sign in again');
      setIsInviting(false);
      return;
    }

    const response = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phoneNumber: trimmedPhoneNumber || null,
        role: newRole,
      }),
    });

    const result = (await response.json()) as {
      admin?: AdminProfile;
      invitationMessage?: string;
      inviteUrl?: string;
      error?: string;
    };

    setIsInviting(false);

    if (!response.ok || !result.admin) {
      notify.error(result.error || 'Could not send admin invite');
      return;
    }

    setAdmins((current) => {
      const withoutDuplicate = current.filter(
        (admin) => admin.uuid !== result.admin?.uuid,
      );
      return [result.admin as AdminProfile, ...withoutDuplicate];
    });
    setNewEmail('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setNewRole('support');
    if (result.invitationMessage) {
      console.info(result.invitationMessage);
    }
    if (result.inviteUrl) {
      console.info('Invite URL:', result.inviteUrl);
    }
    notify.success(
      `Invite link generated for ${normalizedEmail}. Check the server log or browser console.`,
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <UserCog size={28} className="text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Management (RBAC)
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage active and pending dashboard administrators
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAdmins}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invite New Admin
            </h2>
          </div>

          {!isSuperAdmin && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <Shield size={18} className="mt-0.5 shrink-0" />
              Only active super-admin accounts can send admin invitations.
            </div>
          )}

          <form onSubmit={handleInviteAdmin} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  disabled={!isSuperAdmin || isInviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-700/50"
                />
              </div>

              <div className="xl:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  disabled={!isSuperAdmin || isInviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-700/50"
                />
              </div>

              <div className="xl:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={!isSuperAdmin || isInviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-700/50"
                />
              </div>

              <div className="xl:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Optional"
                  disabled={!isSuperAdmin || isInviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-700/50"
                />
              </div>

              <div className="xl:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as AdminRole)}
                  disabled={!isSuperAdmin || isInviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-700/50"
                >
                  {adminRoles.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isSuperAdmin || isInviting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {isInviting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send Invite
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Current Admins
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['SN', 'Name', 'Email', 'Role', 'Status', 'Last Sign In'].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-6 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
                ) : sortedAdmins.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No admin accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmins.map((admin, index) => (
                    <tr
                      key={admin.uuid}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {pageStartIndex + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {admin.first_name} {admin.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {admin.email}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(admin.role)}`}
                        >
                          {formatRole(admin.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            admin.is_active
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {admin.is_active ? (
                            <CheckCircle size={14} />
                          ) : (
                            <Ban size={14} />
                          )}
                          {admin.is_active ? 'Active' : 'Pending Invite'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatDate(admin.last_sign_in_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            pageSize={ADMINS_PER_PAGE}
            totalItems={sortedAdmins.length}
            itemLabel="admins"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
