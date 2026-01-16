"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

/* ========================= SIGNUP WITH PHONE ========================= */

export default function SignupWithPhone() {
  const router = useRouter();

  // Store ONLY 10 digits, we’ll prepend +91 when calling Supabase
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(0);

  const fullPhone = `+91${phone}`;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  /* ========================= SEND OTP ========================= */
  const sendOtp = async () => {
    setErrorMsg("");

    if (phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);

    // Supabase handles:
    // - first-time signup
    // - existing users
    // - pending users
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message || "Failed to send OTP. Please try again.");
      return;
    }

    setStep("otp");
    setTimer(60);
  };

  /* ========================= VERIFY OTP ========================= */
  const verifyOtp = async () => {
    setErrorMsg("");

    if (otp.trim().length < 4) {
      setErrorMsg("Please enter the OTP.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: "sms",
    });

    setLoading(false);

    if (error || !data?.user) {
      setErrorMsg(error?.message || "Invalid OTP. Please try again.");
      return;
    }

    // Optional: store phone in your own table
    try {
      await supabase
        .from("credentials")
        .upsert(
          { id: data.user.id, phone: fullPhone },
          { onConflict: "id" }
        );
    } catch {
      // Non-blocking
    }

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
              Sign up with Phone
            </h1>

            <p className="text-center text-gray-500 mb-8 text-sm">
              {step === "phone"
                ? "We’ll send you a one-time password"
                : `Enter the OTP sent to +91 ${phone}`}
            </p>

            {step === "phone" && (
              <>
                <div className="flex mb-4">
                  <div className="flex items-center px-4 bg-gray-100 border-2 border-r-0 border-gray-100 rounded-l-xl text-gray-600 font-semibold">
                    +91
                  </div>

                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      if (digitsOnly.length <= 10) setPhone(digitsOnly);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-r-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                  />
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                >
                  {loading ? "Sending OTP..." : "Request OTP"}
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
              </>
            )}

            {step === "otp" && (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full px-4 py-3 mb-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                />

                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  onClick={sendOtp}
                  disabled={timer > 0 || loading}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-[#14b8a6] transition-colors"
                >
                  {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
                </button>

                <button
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setErrorMsg("");
                  }}
                  className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Change phone number
                </button>
              </>
            )}

            {errorMsg && (
              <p className="mt-4 text-sm text-red-600 text-center">{errorMsg}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
