"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          localStorage.setItem("isAuthenticated", "true");
          document.cookie =
            "isAuthenticated=true; path=/; max-age=86400; samesite=lax";
          router.replace("/dashboard");
          return;
        }
      } catch (e) {
        // ignore and allow sign-in UI
      } finally {
        setCheckingSession(false);
      }
    };

    check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (authError || !authData.user) {
        throw new Error(
          authError?.message ||
            "Invalid credentials. Create this admin in Supabase Authentication, then link admin_profile.uuid to the auth user id.",
        );
      }

      const { data: adminProfile, error: profileError } = await supabase
        .from("admin_profile")
        .select("uuid, is_active")
        .eq("uuid", authData.user.id)
        .single();

      if (profileError || !adminProfile) {
        await supabase.auth.signOut();
        throw new Error(
          "Access denied: this Supabase Auth user is not linked to an admin_profile row.",
        );
      }

      if (!adminProfile.is_active) {
        await supabase.auth.signOut();
        throw new Error("Account disabled. Please contact system administrator.");
      }

      await supabase.rpc("touch_admin_last_sign_in");

      localStorage.setItem("isAuthenticated", "true");
      document.cookie = "isAuthenticated=true; path=/; max-age=86400; samesite=lax";

      notify.success("Login successful. Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "An error occurred during sign in.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <Image
        src="/LPP fleet.jpg"
        alt="Limpopo fleet"
        fill
        priority
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/65" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg bg-black">
          <div className="rounded-2xl border border-white/10 bg-white/92 p-8 shadow-2xl backdrop-blur-sm dark:bg-gray-800/88">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-12"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <a
                  href="#"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                >
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-[#b28117] py-3 font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-[#8f6712] disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
