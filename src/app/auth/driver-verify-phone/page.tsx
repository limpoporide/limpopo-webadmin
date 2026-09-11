'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, CheckCircle2, Loader2, Mail, Phone, Send } from 'lucide-react';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PHONE_COUNTRY_CODE, maskPhoneNumber, toE164 } from '@/lib/phone';

type DriverProfile = {
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_num: string;
  phone_verified: boolean;
};

type Step = 'phone' | 'code';

const EMAIL_OTP_TYPES = ['magiclink', 'invite', 'recovery', 'signup', 'email'] as const;

type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

const isEmailOtpType = (value: string | null): value is EmailOtpType =>
  value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);

const clearInviteParams = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

const inputClasses =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

export default function DriverVerifyPhonePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const authCode = params.get('code');
      const tokenHash = params.get('token_hash') || params.get('token');
      const otpType = params.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const linkError =
        hashParams.get('error_description') ||
        hashParams.get('error') ||
        params.get('error_description') ||
        params.get('error');

      if (linkError) {
        notify.error(linkError);
        clearInviteParams();
      } else if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          notify.error(error.message);
        }

        clearInviteParams();
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          notify.error(error.message);
        }

        clearInviteParams();
      } else if (tokenHash && isEmailOtpType(otpType)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (error) {
          notify.error(error.message);
        }

        clearInviteParams();
      }

      // The email link is only a convenience; without it the phone number itself
      // identifies the driver, exactly like the driver app's own OTP sign-in.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setIsBootstrapping(false);
        return;
      }

      const profileResponse = await fetch('/api/admin/get-invite-driver-profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const profileResult = (await profileResponse.json()) as {
        profile?: DriverProfile;
        error?: string;
      };

      if (!profileResponse.ok || !profileResult.profile) {
        setIsBootstrapping(false);
        return;
      }

      if (profileResult.profile.phone_verified) {
        router.replace('/auth/driver-invite');
        return;
      }

      setProfile(profileResult.profile);
      setPhone(profileResult.profile.phone_num);
      setPhoneE164(toE164(profileResult.profile.phone_num) ?? '');
      setIsBootstrapping(false);
    };

    bootstrap();
  }, [router]);

  const handleSendOtp = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const normalized = toE164(phone || phoneE164);

    if (!normalized) {
      notify.error('Enter a valid phone number');
      return;
    }

    setIsSendingOtp(true);

    // Matches the driver app: shouldCreateUser false so no second account is minted.
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { shouldCreateUser: false },
    });

    setIsSendingOtp(false);

    if (error) {
      notify.error(
        /signups not allowed|not found/i.test(error.message)
          ? 'No driver account exists for this phone number. Contact your administrator.'
          : error.message,
      );
      return;
    }

    setPhoneE164(normalized);
    setStep('code');
    notify.success(`Verification code sent to ${maskPhoneNumber(normalized)}.`);
  };

  const handleConfirmOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (code.length !== 6) {
      notify.error('Enter the 6-digit code');
      return;
    }

    setIsConfirming(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: code,
      type: 'sms',
    });

    if (error) {
      setIsConfirming(false);
      notify.error(error.message);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const confirmResponse = await fetch('/api/driver/confirm-phone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });

    const confirmResult = (await confirmResponse.json()) as { error?: string };

    setIsConfirming(false);

    if (!confirmResponse.ok) {
      notify.error(confirmResult.error || 'This phone number is not linked to a driver profile.');
      return;
    }

    notify.success('Phone number verified. Now create your password.');
    router.replace('/auth/driver-invite');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl dark:bg-gray-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
            <Car size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Phone Number
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Confirm your registered phone number to continue setting up your
            driver account.
          </p>
        </div>

        {isBootstrapping ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking your invite...
          </div>
        ) : (
          <div className="space-y-5">
            {profile ? (
              <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {profile.first_name} {profile.last_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Mail size={14} className="shrink-0" />
                  <span className="break-all">{profile.email}</span>
                </div>
              </div>
            ) : null}

            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="08012345678"
                    className={inputClasses}
                    readOnly={Boolean(profile)}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Local numbers are sent as {DEFAULT_PHONE_COUNTRY_CODE}.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingOtp ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmOtp} className="space-y-5">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900/50 dark:text-gray-300">
                  <Phone size={14} className="shrink-0 text-gray-400" />
                  <span>Code sent to {maskPhoneNumber(phoneE164)}</span>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enter the 6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="123456"
                    maxLength={6}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-lg tracking-[0.5em] text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConfirming}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirming ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Confirm Code
                </button>

                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isSendingOtp || isConfirming}
                  className="w-full text-center text-sm font-medium text-orange-600 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-orange-400"
                >
                  {isSendingOtp ? 'Resending...' : 'Resend code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                  }}
                  className="w-full text-center text-sm font-medium text-gray-500 transition hover:underline dark:text-gray-400"
                >
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
