"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/createClient";
import Plasma from "@/components/Plasma";

/* ========================= SIGNUP WITH PHONE ========================= */

type RememberedAccount = {
  userId: string;
  name: string;
  phone: string;
  deviceToken: string;
  refreshToken: string;
  accessToken?: string;
};

const REMEMBERED_ACCOUNT_KEY = "vytara_remembered_account";

export default function SignupPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const fullPhone = `+91${phone}`;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const resolveDisplayName = async (userId: string, fallback: string) => {
    const { data } = await supabase
      .from("personal")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return data?.display_name?.trim() || fallback;
  };

  const saveRememberedAccount = (account: RememberedAccount) => {
    window.localStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify(account));
  };

  /* ========================= SEND OTP ========================= */
  const sendOtp = async () => {
    setErrorMsg("");

    if (phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);

    const { data: existingUser, error: lookupError } = await supabase
      .from("personal")
      .select("id")
      .eq("phone", fullPhone)
      .maybeSingle();

    if (lookupError) {
      console.warn("Phone lookup failed; proceeding with OTP.", lookupError);
    } else if (existingUser) {
      setLoading(false);
      setErrorMsg("Account already exists. Please sign in.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      const lowerMessage = error.message.toLowerCase();
      if (lowerMessage.includes("already")) {
        setErrorMsg("Account already exists. Please sign in.");
      } else {
        setErrorMsg(error.message || "Failed to send OTP. Please try again.");
      }
      return;
    }

    setStep("otp");
    setTimer(60);
  };

  /* ========================= VERIFY OTP ========================= */
  const verifyOtp = async () => {
    setErrorMsg("");

    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setErrorMsg("Please enter the 6-digit OTP.");
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

    if (rememberDevice) {
      const deviceToken =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const fallbackName = data.user.phone ?? fullPhone;
      const displayName = await resolveDisplayName(data.user.id, fallbackName);
      const registerResponse = await fetch("/api/auth/remember-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          deviceToken,
          label: navigator.userAgent,
          accessToken: data.session?.access_token ?? null,
        }),
      });

      if (!registerResponse.ok) {
        setErrorMsg("Couldn't save this device. You can still sign up.");
      } else if (data.session?.refresh_token) {
        saveRememberedAccount({
          userId: data.user.id,
          name: displayName,
          phone,
          deviceToken,
          refreshToken: data.session.refresh_token,
          accessToken: data.session.access_token,
        });
      }
    }

    try {
      const { error: upsertError } = await supabase
        .from("personal")
        .upsert(
          { id: data.user.id, phone: fullPhone },
          { onConflict: "id" }
        );
      if (upsertError) {
        console.error("Personal upsert failed:", upsertError);
      }
    } catch {
      // Non-blocking
    }

    router.push("/app/health-onboarding");
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loading) return;
                if (step === "phone") {
                  sendOtp();
                } else {
                  verifyOtp();
                }
              }}
            >
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

                <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#14b8a6] focus:ring-[#14b8a6]"
                  />
                  Save this account on this device
                </label>

                <button
                  type="submit"
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
                        type="button"
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
                  <div
                    className="flex items-center justify-between gap-2 mb-4"
                    onPaste={(e) => {
                      const text = e.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      if (!text) return;
                      e.preventDefault();
                      const next = Array(6).fill("");
                      text.split("").forEach((char, idx) => {
                        next[idx] = char;
                      });
                      setOtpDigits(next);
                      otpRefs.current[Math.min(text.length, 6) - 1]?.focus();
                    }}
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(-1);
                          const next = [...otpDigits];
                          next[idx] = value;
                          setOtpDigits(next);
                          if (value && idx < 5) {
                            otpRefs.current[idx + 1]?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
                            otpRefs.current[idx - 1]?.focus();
                          }
                          if (e.key === "ArrowLeft" && idx > 0) {
                            otpRefs.current[idx - 1]?.focus();
                          }
                          if (e.key === "ArrowRight" && idx < 5) {
                            otpRefs.current[idx + 1]?.focus();
                          }
                        }}
                        className="w-11 h-12 text-center text-lg font-semibold bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#14b8a6] focus:bg-white focus:outline-none transition-all text-black"
                        aria-label={`OTP digit ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>

                  {timer > 0 ? (
                    <p className="mt-3 text-xs text-gray-400 text-center">
                      Resend available in {timer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={sendOtp}
                      className="mt-3 text-xs text-[#14b8a6] font-semibold hover:underline block mx-auto"
                    >
                      Resend OTP
                    </button>
                  )}
                </>
              )}
            </form>

            {errorMsg && (
              <p className="mt-4 text-sm text-red-600 text-center">{errorMsg}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
