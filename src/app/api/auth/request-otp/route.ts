import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RequestOtpPayload = {
  phone?: string;
  shouldCreateUser?: boolean;
};

const INDIAN_PHONE_REGEX = /^\+91\d{10}$/;

export async function POST(request: Request) {
  let payload: RequestOtpPayload | null = null;

  try {
    payload = (await request.json()) as RequestOtpPayload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const phone = payload?.phone?.trim() ?? "";
  const shouldCreateUser = Boolean(payload?.shouldCreateUser);

  if (!INDIAN_PHONE_REGEX.test(phone)) {
    return NextResponse.json(
      { message: "Please provide a valid +91 phone number." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { message: "Supabase configuration is missing." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser },
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
