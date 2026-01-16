import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "email_required" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { error: "server_not_configured" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } =
      await supabaseAdmin.auth.admin.getUserByEmail(
        email.trim().toLowerCase()
      );

    // User exists
    if (data?.user) {
      return NextResponse.json({ exists: true });
    }

    // User does not exist (this is NOT an error)
    if (error && error.code === "user_not_found") {
      return NextResponse.json({ exists: false });
    }

    // Unexpected error
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error("check-user failed:", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}
