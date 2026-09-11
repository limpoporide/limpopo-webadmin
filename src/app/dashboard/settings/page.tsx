'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Lock,
  Palette,
  Save,
  Settings,
  User,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import type { Tables } from '@/types/database.types';

type AdminProfile = Pick<
  Tables<'admin_profile'>,
  | 'uuid'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone_num'
  | 'role'
  | 'is_active'
  | 'last_sign_in_at'
>;

const formatRole = (role: AdminProfile['role']) =>
  role
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const loadAdminProfile = async () => {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        localStorage.removeItem('isAuthenticated');
        document.cookie = 'isAuthenticated=; path=/; max-age=0';
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('admin_profile')
        .select(
          'uuid, first_name, last_name, email, phone_num, role, is_active, last_sign_in_at',
        )
        .eq('uuid', user.id)
        .limit(2);

      if (error) {
        notify.error(error.message);
        setIsLoading(false);
        return;
      }

      if ((data?.length ?? 0) > 1) {
        notify.error('Multiple admin profiles are linked to your account. Please clean up duplicate admin records.');
        setIsLoading(false);
        return;
      }

      const adminProfile = data?.[0] ?? null;

      if (!adminProfile) {
        notify.error('This authenticated user is not linked to an admin profile.');
        setIsLoading(false);
        return;
      }

      setProfile(adminProfile);
      setFirstName(adminProfile.first_name);
      setLastName(adminProfile.last_name);
      setPhoneNumber(adminProfile.phone_num || '');
      setEmail(adminProfile.email || user.email || '');
      setIsLoading(false);
    };

    loadAdminProfile();
  }, [router]);

  const showSuccess = (message: string) => {
    notify.success(message);
  };

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      notify.error('Admin profile is not loaded yet.');
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      notify.error('First name and last name are required.');
      return;
    }

    setIsSavingProfile(true);

    const { data, error } = await supabase
      .from('admin_profile')
      .update({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        phone_num: phoneNumber.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('uuid', profile.uuid)
      .select(
        'uuid, first_name, last_name, email, phone_num, role, is_active, last_sign_in_at',
      )
      .single();

    setIsSavingProfile(false);

    if (error || !data) {
      notify.error(error?.message || 'Could not update profile.');
      return;
    }

    setProfile(data);
    setFirstName(data.first_name);
    setLastName(data.last_name);
    setPhoneNumber(data.phone_num || '');
    showSuccess('Profile updated successfully.');
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      notify.error('Admin email is not available for password verification.');
      return;
    }

    if (newPassword.length < 6) {
      notify.error('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      setIsChangingPassword(false);
      notify.error('Current password is incorrect.');
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsChangingPassword(false);

    if (passwordError) {
      notify.error(passwordError.message);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showSuccess('Password changed successfully.');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <Settings size={28} className="text-gray-600 dark:text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account Settings
          </h1>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Profile Information
              </h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {profile && (
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Role
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatRole(profile.role)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Last Sign In
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDateTime(profile.last_sign_in_at)}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 flex items-center gap-2">
              <Lock size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Change Password
              </h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChangingPassword ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Update Password
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 flex items-center gap-2">
              <Palette size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Theme Settings
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`rounded-lg border-2 px-6 py-3 transition ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Light Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`rounded-lg border-2 px-6 py-3 transition ${
                  theme === 'dark'
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Dark Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
