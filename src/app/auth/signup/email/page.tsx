"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

/**
 * Signup with Email (Magic Link)
 *
 * Flow:
 * 1. User enters email
 * 2. Supabase sends verification link
 * 3. User clicks link → redirected to /auth/callback
 * 4. User sets password at /auth/set-password
 */

export default function SignupWithEmail() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch(
        `/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`
      );

      if (!response.ok) {
        setLoading(false);
        setErrorMsg("Unable to verify email. Please try again.");
        return;
      }

      const result = await response.json();

      if (result?.exists) {
        setLoading(false);
        setErrorMsg("Account already exists. Please sign in.");
        return;
      }
    } catch (error) {
      console.error("Email lookup failed", error);
      setLoading(false);
      setErrorMsg("Unable to verify email. Please try again.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/set-password`;

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      // Supabase safely handles existing users
      if (error.message.toLowerCase().includes("already")) {
        setErrorMsg("Account already exists. Please sign in.");
      } else {
        setErrorMsg(error.message || "Failed to send verification link.");
      }
      return;
    }

    setSuccessMsg(
      "Verification link sent! Please check your email to continue."
    );
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative bg-slate-950 overflow-hidden py-12">
      <Plasma />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          <div className="h-2 bg-gradient-to-r from-[#14b8a6] to-[#134E4A]" />

          <div className="p-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/vytara-logo.png"
                alt="Vytara Logo"
                width={96}
                height={96}
                className="w-24 h-24"
                priority
              />
            </div>

            <h1 className="text-center text-[#14b8a6] text-3xl font-bold mb-1">
              Sign up with Email
            </h1>
            <p className="text-center text-gray-500 mb-8 text-sm">
              We’ll email you a verification link to continue
            </p>

            <form className="space-y-5" onSubmit={sendMagicLink}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
              >
                {loading ? "Sending Link..." : "Send Verification Link"}
              </button>

              {errorMsg && (
                <p className="text-sm text-red-600 text-center">{errorMsg}</p>
              )}

              {successMsg && (
                <p className="text-sm text-emerald-700 text-center">
                  {successMsg}
                </p>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
              <button
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => router.push("/auth/signup")}
              >
                Back to signup options
              </button>

              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  className="text-[#14b8a6] font-bold hover:underline"
                  onClick={() => router.push("/auth/login")}
                >
                  Sign In
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
