import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  hashDeviceToken,
  REMEMBER_DEVICE_COOKIE_NAME,
  rememberDeviceCookieClearOptions,
} from "@/lib/rememberDevice";
import { pickRememberedAccountName } from "@/lib/rememberedAccount";

export const runtime = "nodejs";

type RememberDeviceProfilePayload = {
  userId?: string;
  deviceToken?: string;
};

const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const resolveDisplayName = async (
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  fallback: string
) => {
  const byAuth = await adminClient
    .from("profiles")
    .select("display_name, name")
    .eq("auth_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (!byAuth.error && byAuth.data?.[0]) {
    return pickRememberedAccountName(byAuth.data[0].display_name, byAuth.data[0].name, fallback);
  }

  const byUser = await adminClient
    .from("profiles")
    .select("display_name, name")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (!byUser.error && byUser.data?.[0]) {
    return pickRememberedAccountName(byUser.data[0].display_name, byUser.data[0].name, fallback);
  }

  return fallback;
};

const clearRememberCookie = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  cookieStore.set(REMEMBER_DEVICE_COOKIE_NAME, "", rememberDeviceCookieClearOptions);
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as RememberDeviceProfilePayload | null;
  const expectedUserId = payload?.userId?.trim() || "";

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ message: "Service role key is missing." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const adminClient = createAdminClient();
  const existingDeviceToken =
    payload?.deviceToken?.trim() || cookieStore.get(REMEMBER_DEVICE_COOKIE_NAME)?.value;

  if (!existingDeviceToken) {
    clearRememberCookie(cookieStore);
    return NextResponse.json({ message: "Saved login expired." }, { status: 401 });
  }

  const { data: rememberedDevice, error: lookupError } = await adminClient
    .from("remembered_devices")
    .select("user_id")
    .eq("device_token_hash", hashDeviceToken(existingDeviceToken))
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ message: lookupError.message }, { status: 500 });
  }

  if (!rememberedDevice?.user_id) {
    clearRememberCookie(cookieStore);
    return NextResponse.json({ message: "Saved login expired." }, { status: 401 });
  }

  if (expectedUserId && rememberedDevice.user_id !== expectedUserId) {
    clearRememberCookie(cookieStore);
    return NextResponse.json({ message: "Saved login expired." }, { status: 403 });
  }

  const { data: authUserData, error: authUserError } =
    await adminClient.auth.admin.getUserById(rememberedDevice.user_id);
  const phone = authUserData?.user?.phone?.trim() || "";

  if (authUserError || !phone) {
    clearRememberCookie(cookieStore);
    return NextResponse.json({ message: "Saved login expired." }, { status: 401 });
  }

  const displayName = await resolveDisplayName(adminClient, rememberedDevice.user_id, phone);

  return NextResponse.json({
    ok: true,
    userId: rememberedDevice.user_id,
    phone,
    displayName,
  });
}
