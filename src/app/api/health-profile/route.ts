import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/server";

type ProfilePayload = {
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
    const { data, error } = await supabase.auth.getUser();

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
            name: item.name?.trim(),
            dosage: item.dosage?.trim() || "",
            frequency: item.frequency?.trim() || "",
          }))
          .filter((item) => item.name)
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

    const { error: upsertErr } = await supabase
      .from("health")
      .upsert(payload, { onConflict: "user_id" });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
