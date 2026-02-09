import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/server";
<<<<<<< HEAD

=======

>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
type ProfilePayload = {
  displayName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  bloodGroup: string;
  heightCm: number | null;
  weightKg: number | null;

  currentDiagnosedCondition: string[];
  allergies: string[];
  ongoingTreatments: string[];
  currentMedication: {
    name: string;
    dosage?: string;
    frequency?: string;
  }[];

  previousDiagnosedConditions: string[];
  pastSurgeries: {
    name: string;
    month: number;
    year: number;
  }[];
  childhoodIllness: string[];
  longTermTreatments: string[];
};

function computeAge(dobISO: string): number | null {
<<<<<<< HEAD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobISO)) return null;
  const dob = new Date(dobISO + "T00:00:00");
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

=======
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobISO)) return null;
  const dob = new Date(dobISO + "T00:00:00");
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
function computeBMI(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg) return null;
  if (heightCm < 50 || heightCm > 260) return null;
  if (weightKg < 10 || weightKg > 400) return null;
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  return Math.round(bmi * 10) / 10;
}

const cleanStringList = (values: string[] | undefined) =>
  Array.isArray(values) ? values.map((item) => item.trim()).filter(Boolean) : [];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProfilePayload;

    const supabase = await supabaseServer();
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Service role key is missing." }, { status: 500 });
    }
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;
    const { data, error } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();
<<<<<<< HEAD

    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Required fields (first 4 questions)
    if (!body?.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) {
      return NextResponse.json({ error: "DOB is required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!body?.bloodGroup || body.bloodGroup.trim().length === 0) {
      return NextResponse.json({ error: "Blood group is required" }, { status: 400 });
    }
    if (!body?.heightCm || !Number.isFinite(body.heightCm)) {
      return NextResponse.json({ error: "Height is required" }, { status: 400 });
    }
=======

    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Required fields (first 4 questions)
    if (!body?.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) {
      return NextResponse.json({ error: "DOB is required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!body?.bloodGroup || body.bloodGroup.trim().length === 0) {
      return NextResponse.json({ error: "Blood group is required" }, { status: 400 });
    }
    if (!body?.heightCm || !Number.isFinite(body.heightCm)) {
      return NextResponse.json({ error: "Height is required" }, { status: 400 });
    }
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
    if (!body?.weightKg || !Number.isFinite(body.weightKg)) {
      return NextResponse.json({ error: "Weight is required" }, { status: 400 });
    }

    const currentDiagnosedCondition = cleanStringList(body.currentDiagnosedCondition);
    const allergies = cleanStringList(body.allergies);
    const ongoingTreatments = cleanStringList(body.ongoingTreatments);
    const previousDiagnosedConditions = cleanStringList(body.previousDiagnosedConditions);
    const childhoodIllness = cleanStringList(body.childhoodIllness);
    const longTermTreatments = cleanStringList(body.longTermTreatments);

    const currentMedication = Array.isArray(body.currentMedication)
      ? body.currentMedication
          .map((item) => ({
            name: item.name?.trim() || "",
            dosage: item.dosage?.trim() || "",
            frequency: item.frequency?.trim() || "",
          }))
          .filter((item) => item.name && item.dosage && item.frequency)
      : [];

    const pastSurgeries = Array.isArray(body.pastSurgeries)
      ? body.pastSurgeries
          .map((item) => ({
            name: item.name?.trim(),
            month: Number(item.month),
            year: Number(item.year),
          }))
          .filter((item) => item.name && item.month && item.year)
      : [];

    // Backend-only computed
    const age = computeAge(body.dateOfBirth);
    const bmi = computeBMI(body.heightCm, body.weightKg);

    const payload = {
      user_id: data.user.id,
      date_of_birth: body.dateOfBirth,
      age,
      blood_group: body.bloodGroup,
      height_cm: body.heightCm,
      weight_kg: body.weightKg,
      bmi,

      current_diagnosed_condition: currentDiagnosedCondition.length ? currentDiagnosedCondition : null,
      allergies: allergies.length ? allergies : null,
      ongoing_treatments: ongoingTreatments.length ? ongoingTreatments : null,
      current_medication: currentMedication.length ? currentMedication : null,
      previous_diagnosed_conditions: previousDiagnosedConditions.length ? previousDiagnosedConditions : null,
      past_surgeries: pastSurgeries.length ? pastSurgeries : null,
      childhood_illness: childhoodIllness.length ? childhoodIllness : null,
      long_term_treatments: longTermTreatments.length ? longTermTreatments : null,

      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await adminClient
      .from("health")
      .upsert(payload, { onConflict: "user_id" });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    const personalPayload = body.displayName?.trim()
      ? { id: data.user.id, display_name: body.displayName.trim(), updated_at: new Date().toISOString() }
      : null;

    const medicationStartDate = new Date().toISOString().split("T")[0];
    const medicationsForUser = currentMedication.map((item) => ({
      id: randomUUID(),
      name: item.name,
      dosage: item.dosage,
      purpose: "",
      frequency: item.frequency,
      timesPerDay: 1,
      startDate: medicationStartDate,
      logs: [],
    }));

    const medicationPayload = {
      user_id: data.user.id,
      medications: medicationsForUser,
      updated_at: new Date().toISOString(),
    };

    if (personalPayload) {
      const { error: personalErr } = await adminClient
        .from("personal")
        .upsert(personalPayload, { onConflict: "id" });
      if (personalErr) {
        return NextResponse.json({ error: personalErr.message }, { status: 400 });
      }
    }

    const { error: medicationErr } = await adminClient
      .from("user_medications")
      .upsert(medicationPayload, { onConflict: "user_id" });
    if (medicationErr) {
      return NextResponse.json({ error: medicationErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
<<<<<<< HEAD
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
=======
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
>>>>>>> b96bf647f27bf548f370b28e47bcadc5e6bd465b
