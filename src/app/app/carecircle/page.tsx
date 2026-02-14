'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, UserPlus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/createClient';
import { useAppProfile } from '@/components/AppProfileProvider';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  INDIA_PHONE_DIGITS,
  PHONE_MAX_DIGITS,
  type CountryOption,
} from '@/lib/countries';

type CareCircleStatus = 'pending' | 'accepted' | 'declined';

type CareCircleMember = {
  id: string;
  name: string;
  status: CareCircleStatus;
  memberProfileId: string | null;
  profileId: string | null;
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

type CacheEntry<T> = { ts: number; value: T };
const CARECIRCLE_CACHE_TTL_MS = 5 * 60 * 1000;
const careCircleCacheKey = (cacheOwnerId: string, key: string) => `vytara:carecircle:${cacheOwnerId}:${key}`;
const readCareCircleCache = <T,>(cacheOwnerId: string, key: string): T | null => {
  if (!cacheOwnerId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(careCircleCacheKey(cacheOwnerId, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > CARECIRCLE_CACHE_TTL_MS) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
};
const writeCareCircleCache = <T,>(cacheOwnerId: string, key: string, value: T) => {
  if (!cacheOwnerId || typeof window === 'undefined') return;
  const entry: CacheEntry<T> = { ts: Date.now(), value };
  window.localStorage.setItem(careCircleCacheKey(cacheOwnerId, key), JSON.stringify(entry));
};

export default function CareCirclePage() {
  const { selectedProfile } = useAppProfile();
  const profileId = selectedProfile?.id ?? '';
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
  const [inviteCountry, setInviteCountry] = useState<CountryOption>(DEFAULT_COUNTRY);
  const [inviteCountryDropdownOpen, setInviteCountryDropdownOpen] = useState(false);
  const [inviteDropdownPosition, setInviteDropdownPosition] = useState({ top: 0, left: 0 });
  const inviteCountryDropdownRef = useRef<HTMLDivElement | null>(null);
  const inviteCountryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [showMyPendingInvites, setShowMyPendingInvites] = useState(false);
  const [showIncomingPendingInvites, setShowIncomingPendingInvites] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isEmergencyEditing, setIsEmergencyEditing] = useState(false);
  const [emergencyCardOwner, setEmergencyCardOwner] = useState<{
    userId: string;
    profileId: string | null;
    name: string;
  } | null>(null);
  const [emergencyCard, setEmergencyCard] =
    useState<EmergencyCardData>(emptyEmergencyCard);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [isSavingEmergency, setIsSavingEmergency] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const openTarget = params.get('open');
    if (openTarget === 'incoming-invites') {
      setShowIncomingPendingInvites(true);
      setShowMyPendingInvites(false);
    }
  }, []);

  const loadEmergencyCard = useCallback(async (targetProfileId: string) => {
    setIsEmergencyLoading(true);
    setEmergencyError(null);

    if (!targetProfileId) {
      setEmergencyCard(emptyEmergencyCard);
      setEmergencyError('No profile found for this member.');
      setIsEmergencyLoading(false);
      return;
    }

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
      .eq('profile_id', targetProfileId)
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
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return;
    }
    const user = session.user;
    setCurrentUserId((prev) => (prev === user.id ? prev : user.id));
    const cacheOwnerId = profileId || user.id;

    const cachedCircleData = readCareCircleCache<CareCircleData>(cacheOwnerId, 'circleData');
    if (cachedCircleData) {
      setCircleData(cachedCircleData);
      setEmergencyCardOwner((prev) =>
        prev || { userId: user.id, profileId: profileId || null, name: cachedCircleData.ownerName }
      );
    }
    const cachedPendingInvites = readCareCircleCache<PendingInvite[]>(cacheOwnerId, 'pendingInvites');
    if (cachedPendingInvites) {
      setPendingInvites(cachedPendingInvites);
    }

    let displayName =
      selectedProfile?.display_name?.trim() ||
      selectedProfile?.name?.trim() ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.phone ||
      'Your';

    const circleName = `${displayName}'s Care Circle`;

    if (profileId) {
      await loadEmergencyCard(profileId);
    } else {
      setEmergencyCard(emptyEmergencyCard);
    }
    setEmergencyCardOwner((prev) => {
      if (!prev || prev.userId === user.id) {
        return { userId: user.id, profileId: profileId || null, name: displayName };
      }
      return prev;
    });

    const response = await fetch(
      `/api/care-circle/links${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`,
      {
      cache: 'no-store',
      }
    );

    if (!response.ok) {
      return;
    }

    const linksData: {
      outgoing: Array<{
        id: string;
        memberId: string;
        memberProfileId: string | null;
        profileId: string | null;
        status: CareCircleStatus;
        displayName: string;
        createdAt: string;
      }>;
      incoming: Array<{
        id: string;
        memberId: string;
        memberProfileId: string | null;
        profileId: string | null;
        status: CareCircleStatus;
        displayName: string;
        createdAt: string;
      }>;
    } = await response.json();

    const myCircleMembers = linksData.outgoing.map((link) => ({
      id: link.memberId,
      name: link.displayName,
      status: link.status,
      memberProfileId: link.memberProfileId,
      profileId: link.profileId,
    }));

    const circlesImIn = linksData.incoming.map((link) => ({
      id: link.memberId,
      name: link.displayName,
      status: link.status,
      memberProfileId: link.memberProfileId,
      profileId: link.profileId,
    }));

    const nextPendingInvites = linksData.outgoing
      .filter((link) => link.status === 'pending')
      .map((link) => ({
        id: link.id,
        contact: link.displayName,
        sentAt: link.createdAt,
      }));
    setPendingInvites(nextPendingInvites);

    const nextCircleData: CareCircleData = {
      circleName,
      ownerName: displayName,
      myCircleMembers,
      circlesImIn,
    };
    setCircleData(nextCircleData);
    writeCareCircleCache(cacheOwnerId, 'pendingInvites', nextPendingInvites);
    writeCareCircleCache(cacheOwnerId, 'circleData', nextCircleData);
  }, [loadEmergencyCard, profileId, selectedProfile?.display_name, selectedProfile?.name]);

  useEffect(() => {
    loadCareCircle();
  }, [loadCareCircle]);

  useEffect(() => {
    if (!inviteCountryDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = inviteCountryDropdownRef.current?.contains(target);
      const inPortal = document.getElementById('carecircle-invite-country-dropdown')?.contains(target);
      if (!inTrigger && !inPortal) setInviteCountryDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inviteCountryDropdownOpen]);

  useEffect(() => {
    if (!inviteCountryDropdownOpen || !inviteCountryTriggerRef.current) return;
    const el = inviteCountryTriggerRef.current;
    const rect = el.getBoundingClientRect();
    setInviteDropdownPosition({ top: rect.bottom + 4, left: rect.left });
  }, [inviteCountryDropdownOpen]);

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
    if (!profileId) {
      setInviteError('Please select a profile before sending invites.');
      return;
    }
    const digitsOnly = inviteContact.replace(/\D/g, '');
    if (!digitsOnly) {
      setInviteError('Please enter a phone number.');
      return;
    }

    const isIndia = inviteCountry.code === 'IN';
    const minLen = isIndia ? INDIA_PHONE_DIGITS : 10;
    if (digitsOnly.length < minLen || digitsOnly.length > PHONE_MAX_DIGITS) {
      setInviteError(
        isIndia
          ? 'Please enter a valid 10-digit phone number.'
          : 'Please enter a valid phone number (10–15 digits).'
      );
      return;
    }

    if (!currentUserId) {
      setInviteError('Please sign in again to send invites.');
      return;
    }

    const fullContact = `${inviteCountry.dialCode}${digitsOnly}`;
    setIsSavingInvite(true);
    setInviteError(null);

    const response = await fetch('/api/care-circle/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contact: fullContact, profileId }),
    });

    if (!response.ok) {
      const errorPayload: { message?: string } = await response.json();
      setInviteError(errorPayload.message ?? 'Unable to send invite.');
      setIsSavingInvite(false);
      return;
    }

    setInviteContact('');
    setInviteCountry(DEFAULT_COUNTRY);
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
    if (!currentUserId || !profileId) {
      setEmergencyError('Please sign in again to save this card.');
      return;
    }

    setIsSavingEmergency(true);
    setEmergencyError(null);

    const payload = {
      profile_id: profileId,
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
      .upsert(payload, { onConflict: 'profile_id' });

    if (error) {
      setEmergencyError('Unable to save the emergency card details.');
      setIsSavingEmergency(false);
      return;
    }

    setIsSavingEmergency(false);
    setIsEmergencyEditing(false);
    await loadEmergencyCard(profileId);
  };

  const handleViewOwnEmergencyCard = async () => {
    if (!currentUserId || !profileId) {
      return;
    }
    const ownerName = circleData.ownerName || 'Your';
    const isViewingOwn = emergencyCardOwner?.userId === currentUserId;

    if (isEmergencyOpen && isViewingOwn) {
      setIsEmergencyOpen(false);
      return;
    }

    setIsEmergencyOpen(true);
    setIsEmergencyEditing(false);
    setEmergencyCardOwner({ userId: currentUserId, profileId, name: ownerName });
    await loadEmergencyCard(profileId);
  };

  const handleViewMemberEmergencyCard = async (member: CareCircleMember) => {
    if (!member.memberProfileId) {
      return;
    }
    setIsEmergencyOpen(true);
    setIsEmergencyEditing(false);
    setEmergencyCardOwner({
      userId: member.id,
      profileId: member.memberProfileId,
      name: member.name,
    });
    await loadEmergencyCard(member.memberProfileId);
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

  const isViewingExternalCard =
    emergencyCardOwner?.userId &&
    currentUserId &&
    emergencyCardOwner.userId !== currentUserId;

  const emergencyCardOwnerLabel = useMemo(() => {
    if (!emergencyCardOwner?.name) {
      return null;
    }
    if (emergencyCardOwner.userId === currentUserId) {
      return 'your';
    }
    return `${emergencyCardOwner.name}'s`;
  }, [currentUserId, emergencyCardOwner]);

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

  const hasMyPendingInvites = pendingInvites.length > 0;
  const hasIncomingPendingInvites = pendingCircleInvites.length > 0;

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
                onClick={handleViewOwnEmergencyCard}
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
            onClick={() => {
              setIsEmergencyOpen(false);
              setIsEmergencyEditing(false);
            }}
          >
            <section
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8 space-y-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Admission-ready emergency card
                  </h2>
                  <p className="text-sm text-slate-500">
                    Keep a ready-to-share snapshot for hospital admissions.
                  </p>
                  {emergencyCardOwnerLabel && (
                    <p className="mt-1 text-sm text-slate-500">
                      Viewing {emergencyCardOwnerLabel} emergency card.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                  {!isViewingExternalCard && (
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
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmergencyOpen(false);
                      setIsEmergencyEditing(false);
                    }}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    aria-label="Close emergency card"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

            {isEmergencyLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                Loading emergency card details…
              </div>
            ) : isEmergencyEditing && !isViewingExternalCard ? (
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
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                My Care Circle
              </h2>
              <p className="text-slate-500 text-sm">
                Members you&apos;ve invited to support your care.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMyPendingInvites(true);
                    setShowIncomingPendingInvites(false);
                  }}
                  className="w-full flex items-center justify-between text-left rounded-xl px-2 py-2 -mx-2 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Pending invites
                    </p>
                    <p className="text-xs text-slate-500">
                      Tap to view pending invites
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMyPendingInvites && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {pendingInvites.length}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Members
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {activeMembers.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {activeMembers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No members have accepted your invite yet.
                    </p>
                  ) : (
                    activeMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium text-slate-900">
                          {member.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(member.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Care Circles I&apos;m In
              </h2>
              <p className="text-slate-500 text-sm">
                Circles owned by others that you&apos;re part of.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowIncomingPendingInvites(true);
                    setShowMyPendingInvites(false);
                  }}
                  className="w-full flex items-center justify-between text-left rounded-xl px-2 py-2 -mx-2 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Pending invites
                    </p>
                    <p className="text-xs text-slate-500">
                      Tap to view pending invites
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasIncomingPendingInvites && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {pendingCircleInvites.length}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Active circles
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {activeCirclesImIn.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {activeCirclesImIn.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      You are not part of any other care circles yet.
                    </p>
                  ) : (
                    activeCirclesImIn.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium text-slate-900">
                          {member.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewMemberEmergencyCard(member)}
                          className="inline-flex items-center justify-center rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                        >
                          View card
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showMyPendingInvites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Pending invites
                </h2>
                <p className="text-xs text-slate-500">
                  Invites you&apos;ve sent
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMyPendingInvites(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close pending invites"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-slate-500">
                  There are no pending invites.
                </p>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                  >
                    <span>{invite.contact}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Pending
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showIncomingPendingInvites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Pending invites
                </h2>
                <p className="text-xs text-slate-500">
                  Invites you&apos;ve received
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIncomingPendingInvites(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close pending invites"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {pendingCircleInvites.length === 0 ? (
                <p className="text-sm text-slate-500">
                  There are no pending invites.
                </p>
              ) : (
                pendingCircleInvites.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Invite to your care circle
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteContact('');
                  setInviteCountry(DEFAULT_COUNTRY);
                  setInviteError(null);
                }}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close invite modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Add a registered user by entering their phone number.
            </p>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <div ref={inviteCountryDropdownRef} className="relative">
                <label className="block text-sm font-medium text-slate-700">
                  Phone number
                </label>
                <div className="mt-2 flex border border-slate-200 bg-white rounded-xl focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                  <div className="relative shrink-0">
                    <button
                      ref={inviteCountryTriggerRef}
                      type="button"
                      onClick={() => setInviteCountryDropdownOpen((v) => !v)}
                      className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 border-r border-slate-200 rounded-l-xl text-slate-700 font-semibold text-sm hover:bg-slate-200 focus:outline-none min-w-[5.5rem]"
                      aria-label="Country code"
                      aria-expanded={inviteCountryDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span>{inviteCountry.dialCode}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${inviteCountryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {inviteCountryDropdownOpen &&
                      createPortal(
                        <div
                          id="carecircle-invite-country-dropdown"
                          className="fixed z-[9999] w-64 bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden"
                          role="listbox"
                          style={{
                            top: inviteDropdownPosition.top,
                            left: inviteDropdownPosition.left,
                          }}
                        >
                          <div className="max-h-[280px] overflow-y-auto overscroll-contain py-1">
                            {COUNTRIES.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                role="option"
                                aria-selected={c.code === inviteCountry.code}
                                onClick={() => {
                                  setInviteCountry(c);
                                  setInviteCountryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none ${c.code === inviteCountry.code ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-700'}`}
                              >
                                {c.name} ({c.dialCode})
                              </button>
                            ))}
                          </div>
                        </div>,
                        document.body
                      )}
                  </div>
                  <input
                    type="tel"
                    value={inviteContact}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      if (digitsOnly.length <= PHONE_MAX_DIGITS) setInviteContact(digitsOnly);
                    }}
                    placeholder="e.g., 9876543210"
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-700 outline-none border-0 bg-white rounded-r-xl"
                  />
                </div>
              </div>
              {inviteError && (
                <p className="text-sm text-rose-600">{inviteError}</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsInviteOpen(false);
                    setInviteContact('');
                    setInviteCountry(DEFAULT_COUNTRY);
                    setInviteError(null);
                  }}
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
