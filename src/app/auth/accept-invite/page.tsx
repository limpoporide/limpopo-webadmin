'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Lock, UserCog } from 'lucide-react';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

type AdminProfile = Pick<
  Tables<'admin_profile'>,
  'uuid' | 'email' | 'first_name' | 'last_name' | 'role' | 'is_active'
>;

const formatRole = (role: AdminProfile['role']) =>
  role
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const clearInviteParams = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

// Retries while Supabase finishes auto-detecting the invite session from the URL.
const resolveInviteUser = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase.auth.getUser();

    if (result.data.user) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return supabase.auth.getUser();
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyInvite = async () => {
      setIsVerifying(true);

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = params.get('code');
      const tokenHash = params.get('token_hash') || params.get('token');
      const otpType = params.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashError =
        hashParams.get('error_description') ||
        hashParams.get('error') ||
        params.get('error_description') ||
        params.get('error');

      if (hashError) {
        notify.error(hashError);
        setIsVerifying(false);
        clearInviteParams();
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          notify.error(error.message);
          setIsVerifying(false);
          return;
        }

        clearInviteParams();
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          notify.error(error.message);
          setIsVerifying(false);
          clearInviteParams();
          return;
        }

        clearInviteParams();
      } else if (tokenHash && (otpType === 'invite' || otpType === 'recovery')) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (error) {
          notify.error(error.message);
          setIsVerifying(false);
          clearInviteParams();
          return;
        }

        clearInviteParams();
      }

      const {
        data: { user },
        error: userError,
      } = await resolveInviteUser();

      if (userError || !user) {
        notify.error('Invite link is invalid or expired. Please request a new invite.');
        setIsVerifying(false);
        return;
      }

      console.log('[ACCEPT-INVITE DEBUG] Verified user ID:', user.id);
      console.log('[ACCEPT-INVITE DEBUG] User email:', user.email);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify.error('Session lost. Please request a new invite.');
        setIsVerifying(false);
        return;
      }

      // Use server API to fetch profile (bypasses RLS)
      const profileResponse = await fetch('/api/admin/get-invite-profile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const profileResult = (await profileResponse.json()) as {
        profile?: AdminProfile;
        error?: string;
      };

      if (!profileResponse.ok || !profileResult.profile) {
        console.error('[ACCEPT-INVITE ERROR]', profileResult.error);
        notify.error(profileResult.error || 'This invite is not linked to an admin profile.');
        setIsVerifying(false);
        return;
      }

      console.log('[ACCEPT-INVITE DEBUG] Fetched profile:', profileResult.profile);
      const adminProfile = profileResult.profile;

      setProfile(adminProfile);
      setIsVerifying(false);
    };

    verifyInvite();
  }, []);

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      notify.error('Invite profile is not loaded yet');
      return;
    }

    if (password.length < 6) {
      notify.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      notify.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      notify.error(passwordError.message);
      setIsSubmitting(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      notify.error('Invite session expired after password creation. Please sign in.');
      setIsSubmitting(false);
      return;
    }

    const response = await fetch('/api/admin/activate-invite', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = (await response.json()) as { error?: string };

    setIsSubmitting(false);

    if (!response.ok) {
      notify.error(result.error || 'Could not activate admin profile.');
      return;
    }

    localStorage.setItem('isAuthenticated', 'true');
    document.cookie = 'isAuthenticated=true; path=/; max-age=86400; samesite=lax';
    notify.success('Password created. Redirecting to dashboard...');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl dark:bg-gray-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <UserCog size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Accept Admin Invite
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create your password to activate your admin account.
          </p>
        </div>

        {isVerifying ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verifying invite...
          </div>
        ) : profile ? (
          <form onSubmit={handleSetPassword} className="space-y-5">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {profile.email} · {formatRole(profile.role)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Lock size={18} />
              )}
              Create Password
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            This invite could not be verified.
          </div>
        )}
      </div>
    </div>
  );
}
