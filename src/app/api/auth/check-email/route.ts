import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function GET(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server not configured." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Unable to verify email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ exists: Boolean(data?.id) });
}
