import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  let payload: { email?: string; phone?: string } = {};
  try {
    payload = await request.json();
  } catch {}

  const email = payload.email?.trim().toLowerCase();
  const phone = payload.phone?.trim();

  if (!email && !phone) {
    return NextResponse.json(
      { error: "email_or_phone_required" },
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

  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
    }

    const users = data.users || [];

    if (
      (email &&
        users.some(
          (user) => user.email && user.email.toLowerCase() === email
        )) ||
      (phone && users.some((user) => user.phone === phone))
    ) {
      return NextResponse.json({ exists: true });
    }

    if (!data.nextPage) break;
    page = data.nextPage;
    if (data.lastPage && page > data.lastPage) break;
  }

  return NextResponse.json({ exists: false });
}
