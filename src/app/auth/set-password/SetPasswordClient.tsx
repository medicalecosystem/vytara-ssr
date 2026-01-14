"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

export default function SetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const code = useMemo(() => searchParams.get("code"), [searchParams]);

  // 1) Verify magic link / PKCE
  useEffect(() => {
    const run = async () => {
      setErrorMsg("");
      setInfoMsg("");
      setCheckingLink(true);

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(
              `This link is invalid or expired. (${error.message || "unknown error"})`
            );
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setErrorMsg("Session not found. Please open the verification link again.");
          return;
        }

        setInfoMsg("Email verified. Set a password to continue.");
      } catch {
        setErrorMsg("Something went wrong while verifying the link.");
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
      setErrorMsg("Session expired. Please sign up again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message || "Failed to set password.");
      setLoading(false);
      return;
    }

    try {
      await supabase
        .from("profiles")
        .upsert(
          { id: userData.user.id, email: userData.user.email },
          { onConflict: "id" }
        );
    } catch {
      // optional
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
                Verifying link…
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSetPassword}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-4 py-3 rounded-xl border text-black"
                />

                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 rounded-xl border text-black"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold"
                >
                  {loading ? "Saving…" : "Set Password"}
                </button>

                {infoMsg && (
                  <p className="text-sm text-emerald-700 text-center">{infoMsg}</p>
                )}
                {errorMsg && (
                  <p className="text-sm text-red-600 text-center">{errorMsg}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
