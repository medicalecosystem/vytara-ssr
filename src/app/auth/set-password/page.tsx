"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

/* ========================= SET PASSWORD PAGE ========================= */
/**
 * Used after email magic link verification.
 *
 * IMPORTANT:
 * In Supabase Dashboard → Auth → URL Configuration:
 * Add these to Redirect URLs:
 * - http://localhost:3000/auth/set-password
 * - https://vytara-official.vercel.app/auth/set-password
 *
 * This page supports both:
 * - PKCE flow (code in query string) via exchangeCodeForSession
 * - Token-in-hash flow (older) via detectSessionInUrl (supabase-js handles it)
 */

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const code = useMemo(() => searchParams.get("code"), [searchParams]);

  // 1) Ensure we have a valid session after coming from magic link
  useEffect(() => {
    const run = async () => {
      setErrorMsg("");
      setInfoMsg("");
      setCheckingLink(true);

      try {
        // If PKCE code exists, exchange it for a session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("exchangeCodeForSession failed", {
              name: error.name,
              message: error.message,
              status: (error as { status?: number }).status,
            });
            setErrorMsg(
              `This link is invalid or expired. (${error.message || "unknown error"})`
            );
            setCheckingLink(false);
            return;
          }
        }

        // For token-in-hash flow, supabase-js can detect it automatically.
        // We still confirm we have a session.
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          console.warn("No session after verification link", {
            hasCode: !!code,
            url: window.location.href,
          });
          setErrorMsg("Session not found. Please open the verification link again.");
          setCheckingLink(false);
          return;
        }

        setInfoMsg("Email verified. Set a password to continue.");
      } catch (e) {
        setErrorMsg("Something went wrong while verifying the link. Please try again.");
      } finally {
        setCheckingLink(false);
      }
    };

    run();
  }, [code]);

  // 2) Set password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!password || !confirm) {
      setErrorMsg("Please enter and confirm your password.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setLoading(false);
      setErrorMsg("Session expired. Please sign up again.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || "Failed to set password. Please try again.");
      return;
    }

    // Optional: upsert profile email (won't block if table doesn't exist)
    try {
      await supabase
        .from("profiles")
        .upsert(
          { id: userData.user.id, email: userData.user.email },
          { onConflict: "id" }
        );
    } catch {
      // ignore
    }

    setLoading(false);
    router.push("/app/homepage");
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
              Set your password
            </h1>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Create a password for your Vytara account
            </p>

            {checkingLink ? (
              <div className="text-center text-sm text-gray-500">
                Verifying link...
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSetPassword}>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !!errorMsg}
                  className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
                >
                  {loading ? "Saving..." : "Set Password"}
                </button>

                {infoMsg && (
                  <p className="text-sm text-emerald-700 text-center">
                    {infoMsg}
                  </p>
                )}

                {errorMsg && (
                  <>
                    <p className="text-sm text-red-600 text-center">{errorMsg}</p>
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => router.push("/auth/signup/email")}
                        className="text-sm text-gray-400 hover:text-[#14b8a6] transition-colors"
                      >
                        Go back to Email Signup
                      </button>
                    </div>
                  </>
                )}

                {!errorMsg && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => router.push("/auth/login")}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
