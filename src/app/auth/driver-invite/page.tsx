"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Car,
  X,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

type DriverProfile = {
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_num: string;
  phone_verified: boolean;
};

const LIMPOPO_HOME_URL =
  process.env.NEXT_PUBLIC_LIMPOPORIDE_HOME_URL || "https://limpoporide.com";

// The driver app's login screen rejects anything that is not exactly this long.
const PASSWORD_LENGTH = 6;

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

export default function DriverInvitePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const verifyInvite = async () => {
      setIsVerifying(true);

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const code = params.get("code");
      const tokenHash = params.get("token_hash") || params.get("token");
      const otpType = params.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError =
        hashParams.get("error_description") ||
        hashParams.get("error") ||
        params.get("error_description") ||
        params.get("error");

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
      } else if (
        tokenHash &&
        (otpType === "invite" || otpType === "recovery")
      ) {
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
        notify.error(
          "Invite link is invalid or expired. Please request a new invite.",
        );
        setIsVerifying(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify.error("Session lost. Please request a new invite.");
        setIsVerifying(false);
        return;
      }

      const profileResponse = await fetch(
        "/api/admin/get-invite-driver-profile",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const profileResult = (await profileResponse.json()) as {
        profile?: DriverProfile;
        error?: string;
      };

      if (!profileResponse.ok || !profileResult.profile) {
        notify.error(
          profileResult.error ||
            "This invite is not linked to a driver profile.",
        );
        setIsVerifying(false);
        return;
      }

      if (!profileResult.profile.phone_verified) {
        router.replace("/auth/driver-verify-phone");
        return;
      }

      setProfile(profileResult.profile);
      setIsVerifying(false);
    };

    verifyInvite();
  }, [router]);

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      notify.error("Invite profile is not loaded yet");
      return;
    }

    if (!new RegExp(`^\\d{${PASSWORD_LENGTH}}$`).test(password)) {
      notify.error(`Password must be exactly ${PASSWORD_LENGTH} digits`);
      return;
    }

    if (password !== confirmPassword) {
      notify.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
      data: { signup_complete: true },
    });

    setIsSubmitting(false);

    if (passwordError) {
      notify.error(
        /at least|too short|characters/i.test(passwordError.message)
          ? `${passwordError.message} Lower the minimum password length to ${PASSWORD_LENGTH} in Supabase Auth settings.`
          : passwordError.message,
      );
      return;
    }

    notify.success(
      "Temporary password created. You can now sign in on the driver app.",
    );
    setIsDone(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl dark:bg-gray-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
            <Car size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Limpopo Ride
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create a temporary 6-digit password to activate your driver account.
          </p>
        </div>

        {isVerifying ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verifying invite...
          </div>
        ) : profile ? (
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                This is a temporary password. You&apos;ll set a permanent one
                after finishing your profile in the driver app.
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Temporary 6-Digit Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, PASSWORD_LENGTH),
                      )
                    }
                    placeholder="------"
                    maxLength={PASSWORD_LENGTH}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-center text-lg tracking-[0.6em] text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Temporary Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, PASSWORD_LENGTH),
                      )
                    }
                    placeholder="------"
                    maxLength={PASSWORD_LENGTH}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-center text-lg tracking-[0.6em] text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Lock size={18} />
              )}
              Create Temporary Password
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            This invite could not be verified.
          </div>
        )}
      </div>

      {isDone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
            <a
              href={LIMPOPO_HOME_URL}
              aria-label="Close and go to Limpopo Ride"
              className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </a>

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 size={30} />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Account Activated
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Your phone number is verified. Open the Limpopo driver app and
              sign in with
              {profile ? ` ${profile.phone_num}` : " your phone number"} and
              your temporary password. You will then finish your profile setup
              and choose your own permanent password.
            </p>

            <a
              href={LIMPOPO_HOME_URL}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Go to Limpopo Ride
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
