"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

/* ========================= LOGIN WITH EMAIL ========================= */

export default function LoginWithEmail() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error || !data.user) {
      // Keep the message professional and non-revealing
      setErrorMsg("Invalid email or password. Please try again.");
      return;
    }

    // Optional: if you want to force email verification before allowing email login:
    // If you already turned email confirmation ON, this is useful.
    if (!data.user.email_confirmed_at) {
      // Resend confirmation email (best-effort)
      await supabase.auth.resend({ type: "signup", email });
      await supabase.auth.signOut();
      setErrorMsg("Please verify your email first. We’ve resent the verification link.");
      return;
    }

    router.push("/app/homepage");
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center relative bg-slate-950 overflow-hidden">
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
              Login with Email
            </h1>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Use your email and password to continue
            </p>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                  placeholder="Email"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              {errorMsg && (
                <p className="text-sm text-red-600 text-center">{errorMsg}</p>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
              <button
                className="text-sm text-gray-400 hover:text-[#14b8a6] transition-colors"
                onClick={() => router.push("/forgotpassword")}
              >
                Forgot your password?
              </button>

              <button
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => router.push("/auth/login")}
              >
                Back to login options
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
