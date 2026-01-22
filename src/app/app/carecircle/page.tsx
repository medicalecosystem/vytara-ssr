'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/createClient';

type CareCircleStatus = 'pending' | 'accepted' | 'declined';

type CareCircleMember = {
  id: string;
  name: string;
  status: CareCircleStatus;
};

type CareCircleData = {
  circleName: string;
  ownerName: string;
  myCircleMembers: CareCircleMember[];
  circlesImIn: CareCircleMember[];
};

type PendingInvite = {
  id: string;
  contact: string;
  sentAt: string;
};

type EmergencyCardData = {
  name: string;
  age: string;
  date_of_birth: string;
  photo_id_on_file: boolean;
  photo_id_last4: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  preferred_hospital: string;
  insurer_name: string;
  plan_type: string;
  tpa_helpline: string;
  insurance_last4: string;
  blood_group: string;
  critical_allergies: string;
  chronic_conditions: string;
  current_meds: string;
  emergency_instructions: string;
};

type EmergencyCardRecord = {
  name: string | null;
  age: number | null;
  date_of_birth: string | null;
  photo_id_on_file: boolean | null;
  photo_id_last4: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  preferred_hospital: string | null;
  insurer_name: string | null;
  plan_type: string | null;
  tpa_helpline: string | null;
  insurance_last4: string | null;
  blood_group: string | null;
  critical_allergies: string | null;
  chronic_conditions: string | null;
  current_meds: string | null;
  emergency_instructions: string | null;
};

const emptyEmergencyCard: EmergencyCardData = {
  name: '',
  age: '',
  date_of_birth: '',
  photo_id_on_file: false,
  photo_id_last4: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  preferred_hospital: '',
  insurer_name: '',
  plan_type: '',
  tpa_helpline: '',
  insurance_last4: '',
  blood_group: '',
  critical_allergies: '',
  chronic_conditions: '',
  current_meds: '',
  emergency_instructions: '',
};

export default function CareCirclePage() {
  const [circleData, setCircleData] = useState<CareCircleData>({
    circleName: 'Loading…',
    ownerName: '',
    myCircleMembers: [],
    circlesImIn: [],
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteContact, setInviteContact] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isEmergencyEditing, setIsEmergencyEditing] = useState(false);
  const [emergencyCard, setEmergencyCard] =
    useState<EmergencyCardData>(emptyEmergencyCard);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [isSavingEmergency, setIsSavingEmergency] = useState(false);

  const loadEmergencyCard = useCallback(async (userId: string) => {
    setIsEmergencyLoading(true);
    setEmergencyError(null);
    const { data, error } = await supabase
      .from('care_emergency_cards')
      .select(
        [
          'name',
          'age',
          'date_of_birth',
          'photo_id_on_file',
          'photo_id_last4',
          'emergency_contact_name',
          'emergency_contact_phone',
          'preferred_hospital',
          'insurer_name',
          'plan_type',
          'tpa_helpline',
          'insurance_last4',
          'blood_group',
          'critical_allergies',
          'chronic_conditions',
          'current_meds',
          'emergency_instructions',
        ].join(',')
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      setEmergencyError('Unable to load the emergency card details.');
      setIsEmergencyLoading(false);
      return;
    }

    const card = data as EmergencyCardRecord | null;

    if (!card) {
      setEmergencyCard(emptyEmergencyCard);
      setIsEmergencyLoading(false);
      return;
    }

    setEmergencyCard({
      name: card.name ?? '',
      age: card.age ? String(card.age) : '',
      date_of_birth: card.date_of_birth ?? '',
      photo_id_on_file: card.photo_id_on_file ?? false,
      photo_id_last4: card.photo_id_last4 ?? '',
      emergency_contact_name: card.emergency_contact_name ?? '',
      emergency_contact_phone: card.emergency_contact_phone ?? '',
      preferred_hospital: card.preferred_hospital ?? '',
      insurer_name: card.insurer_name ?? '',
      plan_type: card.plan_type ?? '',
      tpa_helpline: card.tpa_helpline ?? '',
      insurance_last4: card.insurance_last4 ?? '',
      blood_group: card.blood_group ?? '',
      critical_allergies: card.critical_allergies ?? '',
      chronic_conditions: card.chronic_conditions ?? '',
      current_meds: card.current_meds ?? '',
      emergency_instructions: card.emergency_instructions ?? '',
    });
    setIsEmergencyLoading(false);
  }, []);

  const loadCareCircle = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return;
    }
    const user = data.user;
    const displayName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split('@')[0] ??
      'Your';
    const circleName = `${displayName}'s Care Circle`;

    setCurrentUserId(user.id);
    await loadEmergencyCard(user.id);

    const response = await fetch('/api/care-circle/links', {
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const linksData: {
      outgoing: Array<{
        id: string;
        memberId: string;
        status: CareCircleStatus;
        displayName: string;
        createdAt: string;
      }>;
      incoming: Array<{
        id: string;
        memberId: string;
        status: CareCircleStatus;
        displayName: string;
        createdAt: string;
      }>;
    } = await response.json();

    const myCircleMembers = linksData.outgoing.map((link) => ({
      id: link.memberId,
      name: link.displayName,
      status: link.status,
    }));

    const circlesImIn = linksData.incoming.map((link) => ({
      id: link.memberId,
      name: link.displayName,
      status: link.status,
    }));

    setPendingInvites(
      linksData.outgoing
        .filter((link) => link.status === 'pending')
        .map((link) => ({
          id: link.id,
          contact: link.displayName,
          sentAt: link.createdAt,
        }))
    );

    setCircleData({
      circleName,
      ownerName: displayName,
      myCircleMembers,
      circlesImIn,
    });
  }, [loadEmergencyCard]);

  useEffect(() => {
    loadCareCircle();
  }, [loadCareCircle]);

  const handleRemove = async (memberId: string) => {
    if (!currentUserId) {
      return;
    }
    await supabase
      .from('care_circle_links')
      .delete()
      .eq('requester_id', currentUserId)
      .eq('recipient_id', memberId);
    await loadCareCircle();
  };

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inviteContact.trim();
    if (!trimmed) {
      return;
    }

    if (!currentUserId) {
      setInviteError('Please sign in again to send invites.');
      return;
    }

    setIsSavingInvite(true);
    setInviteError(null);

    const response = await fetch('/api/care-circle/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contact: trimmed }),
    });

    if (!response.ok) {
      const errorPayload: { message?: string } = await response.json();
      setInviteError(errorPayload.message ?? 'Unable to send invite.');
      setIsSavingInvite(false);
      return;
    }

    setInviteContact('');
    setIsInviteOpen(false);
    setIsSavingInvite(false);
    await loadCareCircle();
  };

  const handleAcceptCircleInvite = async (memberId: string) => {
    if (!currentUserId) {
      return;
    }
    await supabase
      .from('care_circle_links')
      .update({ status: 'accepted' })
      .eq('recipient_id', currentUserId)
      .eq('requester_id', memberId);
    await loadCareCircle();
  };

  const handleDeclineCircleInvite = async (memberId: string) => {
    if (!currentUserId) {
      return;
    }
    await supabase
      .from('care_circle_links')
      .update({ status: 'declined' })
      .eq('recipient_id', currentUserId)
      .eq('requester_id', memberId);
    await loadCareCircle();
  };

  const handleEmergencyChange = <Key extends keyof EmergencyCardData>(
    key: Key,
    value: EmergencyCardData[Key]
  ) => {
    setEmergencyCard((prev) => ({ ...prev, [key]: value }));
  };

  const handleEmergencySave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!currentUserId) {
      setEmergencyError('Please sign in again to save this card.');
      return;
    }

    setIsSavingEmergency(true);
    setEmergencyError(null);

    const payload = {
      user_id: currentUserId,
      name: emergencyCard.name || null,
      age: emergencyCard.age ? Number(emergencyCard.age) : null,
      date_of_birth: emergencyCard.date_of_birth || null,
      photo_id_on_file: emergencyCard.photo_id_on_file,
      photo_id_last4: emergencyCard.photo_id_last4 || null,
      emergency_contact_name: emergencyCard.emergency_contact_name || null,
      emergency_contact_phone: emergencyCard.emergency_contact_phone || null,
      preferred_hospital: emergencyCard.preferred_hospital || null,
      insurer_name: emergencyCard.insurer_name || null,
      plan_type: emergencyCard.plan_type || null,
      tpa_helpline: emergencyCard.tpa_helpline || null,
      insurance_last4: emergencyCard.insurance_last4 || null,
      blood_group: emergencyCard.blood_group || null,
      critical_allergies: emergencyCard.critical_allergies || null,
      chronic_conditions: emergencyCard.chronic_conditions || null,
      current_meds: emergencyCard.current_meds || null,
      emergency_instructions: emergencyCard.emergency_instructions || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('care_emergency_cards')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      setEmergencyError('Unable to save the emergency card details.');
      setIsSavingEmergency(false);
      return;
    }

    setIsSavingEmergency(false);
    setIsEmergencyEditing(false);
    await loadEmergencyCard(currentUserId);
  };

  const photoIdLabel = useMemo(() => {
    if (emergencyCard.photo_id_on_file && emergencyCard.photo_id_last4) {
      return `On file •••• ${emergencyCard.photo_id_last4}`;
    }
    if (emergencyCard.photo_id_on_file) {
      return 'On file';
    }
    if (emergencyCard.photo_id_last4) {
      return `•••• ${emergencyCard.photo_id_last4}`;
    }
    return 'Not provided';
  }, [emergencyCard.photo_id_last4, emergencyCard.photo_id_on_file]);

  const insuranceLast4Label = useMemo(() => {
    if (!emergencyCard.insurance_last4) {
      return 'Not provided';
    }
    return `•••• ${emergencyCard.insurance_last4}`;
  }, [emergencyCard.insurance_last4]);

  const activeMembers = useMemo(
    () =>
      circleData.myCircleMembers.filter(
        (member) => member.status === 'accepted' && member.id !== currentUserId
      ),
    [circleData.myCircleMembers, currentUserId]
  );

  const pendingCircleInvites = useMemo(
    () => circleData.circlesImIn.filter((member) => member.status === 'pending'),
    [circleData.circlesImIn]
  );

  const activeCirclesImIn = useMemo(
    () => circleData.circlesImIn.filter((member) => member.status === 'accepted'),
    [circleData.circlesImIn]
  );

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-teal-600 font-semibold">
                Care Circle
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">
                {circleData.circleName}
              </h1>
              <p className="text-slate-500 mt-2">
                Owned by <span className="font-semibold text-slate-700">{circleData.ownerName}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsEmergencyOpen((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-teal-200 bg-white text-teal-700 font-semibold shadow-sm hover:bg-teal-50 transition"
              >
                Emergency card
              </button>
              <button
                type="button"
                onClick={() => setIsInviteOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-md shadow-teal-900/20 hover:bg-teal-700 transition"
              >
                <UserPlus className="h-5 w-5" />
                Invite member
              </button>
            </div>
          </div>
        </section>

        {isEmergencyOpen && (
          <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8 space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Admission-ready emergency card
                </h2>
                <p className="text-sm text-slate-500">
                  Keep a ready-to-share snapshot for hospital admissions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmergencyEditing(false)}
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                    !isEmergencyEditing
                      ? 'bg-teal-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Card preview
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmergencyEditing(true)}
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                    isEmergencyEditing
                      ? 'bg-teal-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Edit card
                </button>
              </div>
            </div>

            {isEmergencyLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                Loading emergency card details…
              </div>
            ) : isEmergencyEditing ? (
              <form
                onSubmit={handleEmergencySave}
                className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Full legal name
                    <input
                      value={emergencyCard.name}
                      onChange={(event) =>
                        handleEmergencyChange('name', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Age
                    <input
                      type="number"
                      min="0"
                      value={emergencyCard.age}
                      onChange={(event) =>
                        handleEmergencyChange('age', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Date of birth
                    <input
                      type="date"
                      value={emergencyCard.date_of_birth}
                      onChange={(event) =>
                        handleEmergencyChange('date_of_birth', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Preferred hospital
                    <input
                      value={emergencyCard.preferred_hospital}
                      onChange={(event) =>
                        handleEmergencyChange(
                          'preferred_hospital',
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Photo ID on file
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={emergencyCard.photo_id_on_file}
                        onChange={(event) =>
                          handleEmergencyChange(
                            'photo_id_on_file',
                            event.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      Mark as on file
                    </div>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Photo ID last 4 digits
                    <input
                      value={emergencyCard.photo_id_last4}
                      onChange={(event) =>
                        handleEmergencyChange('photo_id_last4', event.target.value)
                      }
                      placeholder="1234"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Emergency contact name
                    <input
                      value={emergencyCard.emergency_contact_name}
                      onChange={(event) =>
                        handleEmergencyChange(
                          'emergency_contact_name',
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Emergency contact phone
                    <input
                      value={emergencyCard.emergency_contact_phone}
                      onChange={(event) =>
                        handleEmergencyChange(
                          'emergency_contact_phone',
                          event.target.value
                        )
                      }
                      placeholder="+1 555 000 0000"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Insurer name
                    <input
                      value={emergencyCard.insurer_name}
                      onChange={(event) =>
                        handleEmergencyChange('insurer_name', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Plan type (optional)
                    <input
                      value={emergencyCard.plan_type}
                      onChange={(event) =>
                        handleEmergencyChange('plan_type', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    TPA + helpline
                    <input
                      value={emergencyCard.tpa_helpline}
                      onChange={(event) =>
                        handleEmergencyChange('tpa_helpline', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Insurance last 4 digits
                    <input
                      value={emergencyCard.insurance_last4}
                      onChange={(event) =>
                        handleEmergencyChange(
                          'insurance_last4',
                          event.target.value
                        )
                      }
                      placeholder="1234"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Blood group
                    <input
                      value={emergencyCard.blood_group}
                      onChange={(event) =>
                        handleEmergencyChange('blood_group', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Critical allergies
                    <input
                      value={emergencyCard.critical_allergies}
                      onChange={(event) =>
                        handleEmergencyChange(
                          'critical_allergies',
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Chronic conditions
                    <input
                      value={emergencyCard.chronic_conditions}
                      onChange={(event) =>
                        handleEmergencyChange(
                          'chronic_conditions',
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Current meds
                    <input
                      value={emergencyCard.current_meds}
                      onChange={(event) =>
                        handleEmergencyChange('current_meds', event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Emergency instructions
                  <textarea
                    rows={3}
                    value={emergencyCard.emergency_instructions}
                    onChange={(event) =>
                      handleEmergencyChange(
                        'emergency_instructions',
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>

                {emergencyError && (
                  <p className="text-sm text-rose-600">{emergencyError}</p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEmergencyEditing(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEmergency}
                    className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    {isSavingEmergency ? 'Saving…' : 'Save card'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50 p-6 shadow-inner">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
                      Emergency ID
                    </p>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      {emergencyCard.name || 'Full legal name'}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>Age: {emergencyCard.age || '—'}</span>
                      <span>DOB: {emergencyCard.date_of_birth || '—'}</span>
                      <span>Blood: {emergencyCard.blood_group || '—'}</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Photo ID: {photoIdLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Emergency contact
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {emergencyCard.emergency_contact_name || 'Not provided'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {emergencyCard.emergency_contact_phone || '—'}
                    </p>
                    {emergencyCard.emergency_contact_phone && (
                      <a
                        href={`tel:${emergencyCard.emergency_contact_phone}`}
                        className="mt-3 inline-flex items-center justify-center rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Call now
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Preferred hospital
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {emergencyCard.preferred_hospital || 'Not provided'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Insurance
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {emergencyCard.insurer_name || 'Not provided'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {emergencyCard.plan_type || 'Plan type'}
                    </p>
                    <p className="text-sm text-slate-600">
                      TPA/Helpline: {emergencyCard.tpa_helpline || '—'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Last 4: {insuranceLast4Label}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Medical notes
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Allergies: {emergencyCard.critical_allergies || '—'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Chronic: {emergencyCard.chronic_conditions || '—'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Meds: {emergencyCard.current_meds || '—'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Instructions: {emergencyCard.emergency_instructions || '—'}
                    </p>
                  </div>
                </div>
                {emergencyError && (
                  <p className="mt-4 text-sm text-rose-600">{emergencyError}</p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
              <p className="text-slate-500 text-sm">
                Invite and remove members from your care circle.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Members in my Care Circle
                  </h3>
                  <p className="text-sm text-slate-500">
                    People you&apos;ve invited to support your care journey.
                  </p>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <h4 className="text-sm font-semibold text-slate-700">
                  Pending invites
                </h4>
                {pendingInvites.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No pending invites yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                      >
                        <span>{invite.contact}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                          Pending
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {activeMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                  No members have accepted your invite yet.
                </div>
              ) : (
                activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
                  >
                    <p className="text-base font-semibold text-slate-900">
                      {member.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Care Circles I&apos;m part of
                  </h3>
                  <p className="text-sm text-slate-500">
                    Accept or decline invites from other care circle owners.
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <h4 className="text-sm font-semibold text-slate-700">
                  Pending invites
                </h4>
                {pendingCircleInvites.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No pending invites right now.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pendingCircleInvites.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"
                      >
                        <span>{member.name}</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptCircleInvite(member.id)}
                            className="inline-flex items-center justify-center rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineCircleInvite(member.id)}
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {activeCirclesImIn.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                  You are not part of any other care circles yet.
                </div>
              ) : (
                activeCirclesImIn.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <p className="text-base font-semibold text-slate-900">
                      {member.name}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Invite to your care circle
              </h2>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close invite modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Add a registered user by entering their phone number or email.
            </p>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Phone number or email
                <input
                  value={inviteContact}
                  onChange={(event) => setInviteContact(event.target.value)}
                  placeholder="name@email.com or +1 555 000 0000"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>
              {inviteError && (
                <p className="text-sm text-rose-600">{inviteError}</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInvite}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  {isSavingInvite ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}