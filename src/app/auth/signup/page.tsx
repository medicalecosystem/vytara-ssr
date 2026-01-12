"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

/* ========================= SIGNUP PAGE (CHOICE) ========================= */

export default function SignupPage() {
  const router = useRouter();

  const signUpWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://vytara-official.vercel.app/auth/callback",
      },
    });

    if (error) {
      console.error(error);
      alert("Google sign-up failed. Please try again.");
    }
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
              Join Vytara
            </h1>
            <p className="text-center text-gray-500 mb-8 text-sm">
              Create your health account today
            </p>

            <div className="space-y-4">
              <button
                onClick={() => router.push("/auth/signup/phone")}
                className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Sign up with Phone Number
              </button>

              <button
                onClick={() => router.push("/auth/signup/email")}
                className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Sign up with Email
              </button>
            </div>

            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="mx-4 text-xs text-gray-400 uppercase tracking-wide">
                Or
              </span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            <button
              onClick={signUpWithGoogle}
              className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-xl py-3 bg-white hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-700">
                Sign up with Google
              </span>
            </button>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
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
