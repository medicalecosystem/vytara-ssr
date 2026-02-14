'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/createClient';

type FamilyRole = 'owner' | 'member';

type FamilyInfo = {
  id: string;
  name: string;
  role: FamilyRole;
};

type FamilyMemberRow = {
  family_id: string;
  role: FamilyRole;
};

type CreateFamilyResult = {
  family_id: string;
  name: string;
};

type JoinFamilyResult = {
  family_id: string;
  name: string;
};

type CreateInviteResult = {
  invite_code: string;
  family_id: string;
};

type PreviewInviteResult = {
  family_id: string;
  name: string;
};

type FamilyMemberDisplay = {
  user_id: string;
  role: FamilyRole;
  name: string;
};

type JoinRequestRow = {
  id: string;
  requester_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type JoinRequestDisplay = JoinRequestRow & {
  display_name: string;
};

type RequestJoinResult = {
  family_id: string;
  name: string;
};

type PendingRequestInfo = {
  id: string;
  family_id: string;
  family_name: string;
};

type MemberDetailsPersonal = {
  display_name: string | null;
  phone: string | null;
  gender?: string | null;
  address?: string | null;
} | null;

type MemberDetailsHealth = {
  date_of_birth: string | null;
  blood_group: string | null;
  bmi: number | null;
  age: number | null;
  current_diagnosed_condition: string[] | null;
  allergies: string[] | null;
  ongoing_treatments: string[] | null;
  current_medication: { name: string; dosage?: string; frequency?: string }[] | null;
  previous_diagnosed_conditions: string[] | null;
  past_surgeries: { name: string; month: number; year: number }[] | null;
  childhood_illness: string[] | null;
  long_term_treatments: string[] | null;
} | null;

type MemberDetailsAppointment = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
  [key: string]: string;
};

type MemberDetailsMedication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose?: string;
  timesPerDay?: number;
  startDate?: string;
  endDate?: string;
};

type VaultCategory = 'all' | 'reports' | 'prescriptions' | 'insurance' | 'bills';
type MemberDetailsTab = 'personal' | 'appointments' | 'medications' | 'vault';
type PendingMemberOpen = {
  memberId: string;
  tab: MemberDetailsTab;
} | null;

type MemberVaultFile = {
  name: string;
  created_at: string | null;
  folder: Exclude<VaultCategory, 'all'>;
  url: string | null;
};

type MemberDetailsPayload = {
  personal: MemberDetailsPersonal;
  health: MemberDetailsHealth;
  appointments: MemberDetailsAppointment[];
  medications: MemberDetailsMedication[];
};

const readRpcRow = <T,>(data: T[] | T | null) => {
  if (!data) return null;
  return Array.isArray(data) ? data[0] : data;
};

const normalizeInviteCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');
const JOIN_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
const FAMILY_MEMBER_LIMIT = 10;

const resolveInviteErrorMessage = (error: { message?: string; code?: string }) => {
  const message = (error.message || '').toLowerCase();
  if (message.includes('not_authenticated')) {
    return 'Please sign in to continue.';
  }
  if (message.includes('not_owner') || message.includes('owner_only')) {
    return 'Only the owner can invite members.';
  }
  return error.message ? `Unable to create an invite code: ${error.message}` : 'Unable to create an invite code. Please try again.';
};

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const normalizeAppointmentDate = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatLocalDate(parsed);
};

const formatVaultDate = (value: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const vaultCategoryLabels: Record<VaultCategory, string> = {
  all: 'All',
  reports: 'Lab Reports',
  prescriptions: 'Prescriptions',
  insurance: 'Insurance',
  bills: 'Bills',
};

const vaultFileExtension = (name: string) => name.split('.').pop()?.toLowerCase();
const isVaultImageFile = (name: string) => {
  const ext = vaultFileExtension(name);
  return (
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'gif' ||
    ext === 'webp' ||
    ext === 'bmp' ||
    ext === 'svg' ||
    ext === 'tif' ||
    ext === 'tiff' ||
    ext === 'heic' ||
    ext === 'heif'
  );
};
const isVaultPdfFile = (name: string) => vaultFileExtension(name) === 'pdf';

export default function FamilyPage() {
  const [userId, setUserId] = useState('');
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const familyRequestIdRef = useRef(0);
  const lastFamilyActionRef = useRef<number | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isJoinRequestsOpen, setIsJoinRequestsOpen] = useState(false);
  const [isDeleteFamilyOpen, setIsDeleteFamilyOpen] = useState(false);

  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [joinPreview, setJoinPreview] = useState<PreviewInviteResult | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMemberDisplay[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestDisplay[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null);
  const [deleteFamilyError, setDeleteFamilyError] = useState<string | null>(null);
  const [pendingJoinFamily, setPendingJoinFamily] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequestInfo | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [isDeletingFamily, setIsDeletingFamily] = useState(false);

  const [createdFamily, setCreatedFamily] = useState<FamilyInfo | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<FamilyMemberDisplay | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetailsPayload | null>(null);
  const [memberDetailsLoading, setMemberDetailsLoading] = useState(false);
  const [memberDetailsError, setMemberDetailsError] = useState<string | null>(null);
  const [memberDetailsTab, setMemberDetailsTab] = useState<MemberDetailsTab>('personal');
  const [vaultCategory, setVaultCategory] = useState<VaultCategory>('all');
  const [vaultFiles, setVaultFiles] = useState<MemberVaultFile[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [vaultPreviewFile, setVaultPreviewFile] = useState<MemberVaultFile | null>(null);
  const [vaultPreviewUrl, setVaultPreviewUrl] = useState<string | null>(null);
  const [vaultPreviewLoading, setVaultPreviewLoading] = useState(false);
  const [openJoinRequestsOnLoad, setOpenJoinRequestsOnLoad] = useState(false);
  const [pendingMemberOpen, setPendingMemberOpen] = useState<PendingMemberOpen>(null);

  const isFamilyAtCapacity = !!family && members.length >= FAMILY_MEMBER_LIMIT;

  const loadFamily = useCallback(
    async (currentUserId: string) => {
      const requestId = ++familyRequestIdRef.current;
      const allowStale =
        family &&
        lastFamilyActionRef.current !== null &&
        Date.now() - lastFamilyActionRef.current < 15_000;

      if (!currentUserId) {
        if (!allowStale) {
          setFamily(null);
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageMessage(null);

      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (requestId !== familyRequestIdRef.current) return;

      if (memberError && memberError.code !== 'PGRST116') {
        setPageMessage('Unable to load your family right now.');
        setIsLoading(false);
        return;
      }

      const memberRow = memberData as FamilyMemberRow | null;
      if (!memberRow) {
        if (!allowStale) {
          setFamily(null);
        }
        setIsLoading(false);
        return;
      }

      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id, name')
        .eq('id', memberRow.family_id)
        .maybeSingle();

      if (requestId !== familyRequestIdRef.current) return;

      if (familyError && familyError.code !== 'PGRST116') {
        setPageMessage('Unable to load your family right now.');
        setIsLoading(false);
        return;
      }

      const resolvedName = familyData?.name ?? family?.name ?? 'Your Family';
      setFamily({
        id: memberRow.family_id,
        name: resolvedName,
        role: memberRow.role,
      });
      setIsLoading(false);
    },
    [family]
  );

  const resolveDisplayNames = useCallback(async (accountIds: string[]) => {
    const ids = Array.from(new Set(accountIds.filter(Boolean)));
    const nameMap = new Map<string, string>();
    if (ids.length === 0) return nameMap;

    const parseDate = (value: string | null) => {
      if (!value) return Number.MAX_SAFE_INTEGER;
      const ts = Date.parse(value);
      return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
    };

    const assignPreferredNames = (
      rows: Array<{
        account_id: string;
        display_name: string | null;
        name: string | null;
        is_primary: boolean | null;
        created_at: string | null;
      }>
    ) => {
      const grouped = new Map<string, typeof rows>();
      rows.forEach((row) => {
        if (!row.account_id) return;
        const current = grouped.get(row.account_id) ?? [];
        current.push(row);
        grouped.set(row.account_id, current);
      });

      grouped.forEach((profiles, accountId) => {
        const preferred = [...profiles].sort((a, b) => {
          const primaryDiff = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
          if (primaryDiff !== 0) return primaryDiff;
          return parseDate(a.created_at) - parseDate(b.created_at);
        })[0];
        const value = preferred?.display_name?.trim() || preferred?.name?.trim() || '';
        if (value && !nameMap.has(accountId)) {
          nameMap.set(accountId, value);
        }
      });
    };

    const { data: byUserRows } = await supabase
      .from('profiles')
      .select('user_id, display_name, name, is_primary, created_at')
      .in('user_id', ids);

    assignPreferredNames(
      (byUserRows ?? []).map((row) => ({
        account_id: row.user_id,
        display_name: row.display_name ?? null,
        name: row.name ?? null,
        is_primary: row.is_primary ?? null,
        created_at: row.created_at ?? null,
      }))
    );

    const missingIds = ids.filter((id) => !nameMap.has(id));
    if (missingIds.length > 0) {
      const { data: byAuthRows, error: byAuthError } = await supabase
        .from('profiles')
        .select('auth_id, display_name, name, is_primary, created_at')
        .in('auth_id', missingIds);

      const missingAuthColumn =
        byAuthError?.code === 'PGRST204' ||
        byAuthError?.message?.toLowerCase().includes('auth_id');

      if (!byAuthError || missingAuthColumn) {
        assignPreferredNames(
          (byAuthRows ?? []).map((row) => ({
            account_id: row.auth_id,
            display_name: row.display_name ?? null,
            name: row.name ?? null,
            is_primary: row.is_primary ?? null,
            created_at: row.created_at ?? null,
          }))
        );
      }
    }

    return nameMap;
  }, []);

  const loadMembers = useCallback(async (familyId: string) => {
    setMembersLoading(true);
    setMembersError(null);

    const { data: memberRows, error: memberError } = await supabase
      .from('family_members')
      .select('user_id, role')
      .eq('family_id', familyId);

    if (memberError) {
      setMembersError('Unable to load family members.');
      setMembersLoading(false);
      return;
    }

    const rows = (memberRows ?? []) as Array<{ user_id: string; role: FamilyRole }>;
    if (rows.length === 0) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }

    const userIds = rows.map((row) => row.user_id);
    const nameMap = await resolveDisplayNames(userIds);

    const hydrated = rows.map((row) => ({
      user_id: row.user_id,
      role: row.role,
      name: nameMap.get(row.user_id) || 'Member',
    }));

    hydrated.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    setMembers(hydrated);
    setMembersLoading(false);
  }, [resolveDisplayNames]);

  const loadJoinRequests = useCallback(async (familyId: string) => {
    setJoinRequestsLoading(true);
    setJoinRequestsError(null);
    const cutoff = new Date(Date.now() - JOIN_REQUEST_TTL_MS).toISOString();

    const { data, error } = await supabase
      .from('family_join_requests')
      .select('id, requester_id, status, created_at')
      .eq('family_id', familyId)
      .eq('status', 'pending')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (error) {
      setJoinRequestsError('Unable to load join requests.');
      setJoinRequestsLoading(false);
      return;
    }

    const rows = (data ?? []) as JoinRequestRow[];
    if (rows.length === 0) {
      setJoinRequests([]);
      setJoinRequestsLoading(false);
      return;
    }

    const requesterIds = rows.map((row) => row.requester_id);
    const nameMap = await resolveDisplayNames(requesterIds);

    const hydrated = rows.map((row) => ({
      ...row,
      display_name: nameMap.get(row.requester_id) || 'Member',
    }));

    setJoinRequests(hydrated);
    setJoinRequestsLoading(false);
  }, [resolveDisplayNames]);

  const loadPendingRequest = useCallback(async (currentUserId: string) => {
    if (!currentUserId) {
      setPendingRequest(null);
      return;
    }
    const cutoff = new Date(Date.now() - JOIN_REQUEST_TTL_MS).toISOString();

    const { data: requestRow } = await supabase
      .from('family_join_requests')
      .select('id, family_id, status')
      .eq('requester_id', currentUserId)
      .eq('status', 'pending')
      .gte('created_at', cutoff)
      .maybeSingle();

    if (!requestRow) {
      setPendingRequest(null);
      return;
    }

    const { data: familyRow } = await supabase
      .from('families')
      .select('name')
      .eq('id', requestRow.family_id)
      .maybeSingle();

    setPendingRequest({
      id: requestRow.id,
      family_id: requestRow.family_id,
      family_name: familyRow?.name ?? 'This family',
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const nextUserId = session?.user?.id ?? '';
      setUserId((prev) => (prev === nextUserId ? prev : nextUserId));
      setIsAuthReady(true);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? '';
      setUserId((prev) => (prev === nextUserId ? prev : nextUserId));
      setIsAuthReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') === 'join-requests') {
      setOpenJoinRequestsOnLoad(true);
    }
    const memberId = params.get('memberId');
    const openTarget = params.get('open');
    if (memberId && (openTarget === 'member-vault' || params.get('tab') === 'vault')) {
      setPendingMemberOpen({ memberId, tab: 'vault' });
    }
  }, []);

  useEffect(() => {
    if (!openJoinRequestsOnLoad) return;
    if (family?.role === 'owner') {
      setIsJoinRequestsOpen(true);
      setOpenJoinRequestsOnLoad(false);
    }
  }, [family?.role, openJoinRequestsOnLoad]);

  useEffect(() => {
    if (!isAuthReady) return;
    loadFamily(userId);
    loadPendingRequest(userId);
  }, [isAuthReady, loadFamily, loadPendingRequest, userId]);

  useEffect(() => {
    if (!family?.id) {
      setMembers([]);
      return;
    }
    loadMembers(family.id);
  }, [family?.id, loadMembers]);

  useEffect(() => {
    if (!pendingMemberOpen) return;
    if (members.length === 0) {
      if (!membersLoading) {
        setPendingMemberOpen(null);
      }
      return;
    }
    const match = members.find((member) => member.user_id === pendingMemberOpen.memberId);
    if (!match) {
      setPendingMemberOpen(null);
      return;
    }
    setSelectedMember(match);
    setMemberDetailsTab(pendingMemberOpen.tab);
    if (pendingMemberOpen.tab === 'vault') {
      setVaultCategory('all');
      setVaultSearchQuery('');
    }
    setPendingMemberOpen(null);
  }, [members, membersLoading, pendingMemberOpen]);

  useEffect(() => {
    if (!family?.id || family.role !== 'owner') {
      setJoinRequests([]);
      return;
    }
    loadJoinRequests(family.id);
  }, [family?.id, family?.role, loadJoinRequests]);

  useEffect(() => {
    if (family) {
      setPendingJoinFamily(null);
      setPendingRequest(null);
    }
  }, [family]);

  useEffect(() => {
    if (!selectedMember) {
      setMemberDetails(null);
      setMemberDetailsError(null);
      setMemberDetailsTab('personal');
      setVaultCategory('all');
      setVaultFiles([]);
      setVaultError(null);
      setVaultLoading(false);
      setVaultSearchQuery('');
      setVaultPreviewFile(null);
      setVaultPreviewUrl(null);
      setVaultPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setMemberDetailsLoading(true);
    setMemberDetailsError(null);
    setMemberDetails(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/family/member/details?memberId=${encodeURIComponent(selectedMember.user_id)}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Failed to load member details');
        }
        const data = (await res.json()) as MemberDetailsPayload;
        if (!cancelled) {
          setMemberDetails(data);
        }
      } catch (err) {
        if (!cancelled) {
          setMemberDetailsError(err instanceof Error ? err.message : 'Failed to load member details');
        }
      } finally {
        if (!cancelled) {
          setMemberDetailsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMember]);

  const closeMemberDetailsModal = () => {
    setSelectedMember(null);
    setMemberDetails(null);
    setMemberDetailsError(null);
    setMemberDetailsTab('personal');
    setVaultCategory('all');
    setVaultFiles([]);
    setVaultError(null);
    setVaultLoading(false);
    setVaultSearchQuery('');
    setVaultPreviewFile(null);
    setVaultPreviewUrl(null);
    setVaultPreviewLoading(false);
  };

  const openCreateModal = () => {
    if (family) {
      setPageMessage('You can only create one family.');
      return;
    }
    if (pendingRequest) {
      setPageMessage('You already have a pending join request.');
      return;
    }
    setPageMessage(null);
    setCreateName('');
    setCreateError(null);
    setCreatedFamily(null);
    setCreatedInviteCode(null);
    setInviteMessage(null);
    setIsCreateOpen(true);
  };

  const openJoinModal = () => {
    if (family) {
      setPageMessage('You are already part of a family.');
      return;
    }
    if (pendingRequest) {
      setPageMessage('You already have a pending join request.');
      return;
    }
    setPageMessage(null);
    setJoinCode('');
    setJoinError(null);
    setJoinPreview(null);
    setPreviewCode(null);
    setInviteMessage(null);
    setIsJoinOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateError(null);
    setCreatedFamily(null);
    setCreatedInviteCode(null);
    setInviteMessage(null);
  };

  const closeJoinModal = () => {
    setIsJoinOpen(false);
    setJoinError(null);
    setJoinPreview(null);
    setPreviewCode(null);
    setInviteMessage(null);
  };

  const closeInviteModal = () => {
    setIsInviteOpen(false);
    setInviteMessage(null);
    setInviteError(null);
    setInviteCode(null);
    setIsInviteLoading(false);
  };

  const openJoinRequestsModal = () => setIsJoinRequestsOpen(true);
  const closeJoinRequestsModal = () => setIsJoinRequestsOpen(false);
  const openDeleteFamilyModal = () => {
    if (!family || family.role !== 'owner') return;
    setDeleteFamilyError(null);
    setIsDeleteFamilyOpen(true);
  };
  const closeDeleteFamilyModal = () => {
    setIsDeleteFamilyOpen(false);
    setDeleteFamilyError(null);
    setIsDeletingFamily(false);
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setInviteMessage('Copied to clipboard.');
    } catch {
      setInviteMessage('Unable to copy. Please copy manually.');
    }
  };

  const fetchInviteCode = useCallback(async () => {
    if (!userId) {
      setInviteError('Please sign in to continue.');
      return;
    }
    if (isFamilyAtCapacity) {
      setInviteError(`This family already has ${FAMILY_MEMBER_LIMIT} members.`);
      return;
    }

    setIsInviteLoading(true);
    setInviteError(null);
    setInviteCode(null);
    setInviteMessage(null);

    const { data, error } = await supabase.rpc('create_family_invite');

    if (error) {
      setInviteError(resolveInviteErrorMessage(error));
      setIsInviteLoading(false);
      return;
    }

    const row = readRpcRow<CreateInviteResult>(
      data as CreateInviteResult[] | CreateInviteResult | null
    );
    if (!row?.invite_code) {
      setInviteError('Unable to create an invite code. Please try again.');
      setIsInviteLoading(false);
      return;
    }

    setInviteCode(row.invite_code);
    setIsInviteLoading(false);
  }, [isFamilyAtCapacity, userId]);


  const openInviteModal = useCallback(() => {
    setInviteMessage(null);
    setInviteError(null);
    setInviteCode(null);
    setIsInviteOpen(true);

    if (!family) return;
    if (family.role !== 'owner') {
      setInviteError('Only the owner can invite members.');
      return;
    }
    if (isFamilyAtCapacity) {
      setInviteError(`This family already has ${FAMILY_MEMBER_LIMIT} members.`);
      return;
    }

    fetchInviteCode();
  }, [family, fetchInviteCode, isFamilyAtCapacity]);

  const fetchFamilyCapacity = useCallback(async (familyId: string) => {
    try {
      const res = await fetch(
        `/api/family/capacity?familyId=${encodeURIComponent(familyId)}`
      );
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as {
        memberCount?: number;
        limit?: number;
        isFull?: boolean;
      };
      return {
        memberCount: data.memberCount ?? 0,
        limit: data.limit ?? FAMILY_MEMBER_LIMIT,
        isFull: Boolean(data.isFull),
      };
    } catch {
      return null;
    }
  }, []);

  const fetchVaultFiles = useCallback(async (memberId: string, category: VaultCategory) => {
    setVaultLoading(true);
    setVaultError(null);
    try {
      const res = await fetch(
        `/api/family/member/vault?memberId=${encodeURIComponent(memberId)}&category=${encodeURIComponent(
          category
        )}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Failed to load vault files.');
      }
      const data = (await res.json()) as { files?: MemberVaultFile[] };
      setVaultFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      setVaultFiles([]);
      setVaultError(err instanceof Error ? err.message : 'Failed to load vault files.');
    } finally {
      setVaultLoading(false);
    }
  }, []);

  const handleVaultPreview = useCallback(
    async (file: MemberVaultFile) => {
      if (!selectedMember) return;
      setVaultPreviewFile(file);
      setVaultPreviewLoading(true);
      setVaultPreviewUrl(null);
      try {
        const res = await fetch(
          `/api/family/member/vault/signed?memberId=${encodeURIComponent(
            selectedMember.user_id
          )}&folder=${encodeURIComponent(file.folder)}&name=${encodeURIComponent(file.name)}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Unable to load preview.');
        }
        const data = (await res.json()) as { url?: string };
        setVaultPreviewUrl(data.url ?? null);
      } catch {
        setVaultPreviewUrl(null);
      } finally {
        setVaultPreviewLoading(false);
      }
    },
    [selectedMember]
  );

  useEffect(() => {
    if (!selectedMember || memberDetailsTab !== 'vault') return;
    fetchVaultFiles(selectedMember.user_id, vaultCategory);
  }, [fetchVaultFiles, memberDetailsTab, selectedMember, vaultCategory]);

  const handleCreate = async () => {
    if (!userId) {
      setCreateError('Please sign in to continue.');
      return;
    }
    if (family) {
      setCreateError('You can only create one family.');
      return;
    }
    if (pendingRequest) {
      setCreateError('You already have a pending join request.');
      return;
    }

    const trimmedName = createName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setCreateError('Family name must be 2–50 characters.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setInviteMessage(null);

    const { data, error } = await supabase.rpc('create_family', {
      family_name: trimmedName,
    });

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('not_authenticated')) {
        setCreateError('Please sign in to continue.');
      } else if (message.includes('already_in_family') || error.code === '23505') {
        setCreateError('You can only create one family.');
      } else if (message.includes('invalid_name')) {
        setCreateError('Family name must be 2–50 characters.');
      } else {
        setCreateError(
          error.message
            ? `Unable to create your family: ${error.message}`
            : 'Unable to create your family. Please try again.'
        );
      }
      setIsCreating(false);
      return;
    }

    const row = readRpcRow<CreateFamilyResult>(
      data as CreateFamilyResult[] | CreateFamilyResult | null
    );
    if (!row) {
      setCreateError('Unable to create your family. Please try again.');
      setIsCreating(false);
      return;
    }

    const nextFamily: FamilyInfo = {
      id: row.family_id,
      name: row.name,
      role: 'owner',
    };

    setFamily(nextFamily);
    setCreatedFamily(nextFamily);
    lastFamilyActionRef.current = Date.now();

    const { data: inviteData, error: inviteErrorResponse } =
      await supabase.rpc('create_family_invite');

    if (inviteErrorResponse) {
      setCreateError(
        'Family created, but we could not generate an invite code yet. Use Invite Member to try again.'
      );
      setIsCreating(false);
      return;
    }

    const inviteRow = readRpcRow<CreateInviteResult>(
      inviteData as CreateInviteResult[] | CreateInviteResult | null
    );
    if (!inviteRow?.invite_code) {
      setCreateError(
        'Family created, but we could not generate an invite code yet. Use Invite Member to try again.'
      );
      setIsCreating(false);
      return;
    }

    setCreatedInviteCode(inviteRow.invite_code);
    setIsCreating(false);
    await loadFamily(userId);
  };

  const handleJoinPreview = async () => {
    if (!userId) {
      setJoinError('Please sign in to continue.');
      return;
    }
    if (family) {
      setJoinError('You are already part of a family.');
      return;
    }
    if (pendingRequest) {
      setJoinError('You already have a pending join request.');
      return;
    }

    const normalized = normalizeInviteCode(joinCode);
    if (!normalized) {
      setJoinError('Family code is required.');
      return;
    }
    if (normalized.length < 6 || normalized.length > 12) {
      setJoinError('Family code must be 6–12 characters.');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(normalized)) {
      setJoinError('Family code must be alphanumeric.');
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setInviteMessage(null);

    const { data, error } = await supabase.rpc('preview_family_invite', {
      invite_code: normalized,
    });

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('not_authenticated')) {
        setJoinError('Please sign in to continue.');
      } else if (message.includes('invalid_code')) {
        setJoinError('Invalid code.');
      } else if (message.includes('already_in_family') || error.code === '23505') {
        setJoinError('You are already part of a family.');
      } else if (message.includes('request_exists') || message.includes('pending_request')) {
        setJoinError('You already have a pending join request.');
      } else {
        setJoinError(
          error.message
            ? `Unable to validate this invite code: ${error.message}`
            : 'Unable to validate this invite code. Please try again.'
        );
      }
      setIsJoining(false);
      return;
    }

    const row = readRpcRow<PreviewInviteResult>(
      data as PreviewInviteResult[] | PreviewInviteResult | null
    );
    if (!row) {
      setJoinError('Unable to validate this invite code. Please try again.');
      setIsJoining(false);
      return;
    }

    const capacity = await fetchFamilyCapacity(row.family_id);
    if (!capacity) {
      setJoinError('Unable to verify family capacity. Please try again.');
      setIsJoining(false);
      return;
    }
    if (capacity.isFull) {
      setJoinError(`This family already has ${capacity.limit} members. You cannot join at this time.`);
      setIsJoining(false);
      return;
    }

    setJoinPreview({ family_id: row.family_id, name: row.name });
    setPreviewCode(normalized);
    lastFamilyActionRef.current = Date.now();
    setIsJoining(false);
  };

  const handleJoinConfirm = async () => {
    if (!previewCode || !joinPreview) {
      setJoinError('Please enter a valid invite code.');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const capacity = await fetchFamilyCapacity(joinPreview.family_id);
    if (!capacity) {
      setJoinError('Unable to verify family capacity. Please try again.');
      setIsJoining(false);
      return;
    }
    if (capacity.isFull) {
      setJoinError(`This family already has ${capacity.limit} members. You cannot join at this time.`);
      setIsJoining(false);
      return;
    }

    const { data, error } = await supabase.rpc('request_join_family', {
      invite_code: previewCode,
    });

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('not_authenticated')) {
        setJoinError('Please sign in to continue.');
      } else if (message.includes('invalid_code')) {
        setJoinError('Invalid code.');
      } else if (message.includes('already_in_family') || error.code === '23505') {
        setJoinError('You are already part of a family.');
      } else if (message.includes('request_exists') || message.includes('pending_request')) {
        setJoinError('You already have a pending join request.');
      } else {
        setJoinError('Unable to send your request. Please try again.');
      }
      setIsJoining(false);
      return;
    }

    const row = readRpcRow<RequestJoinResult>(
      data as RequestJoinResult[] | RequestJoinResult | null
    );
    if (!row) {
      setJoinError('Unable to send your request. Please try again.');
      setIsJoining(false);
      return;
    }

    setPendingJoinFamily(row.name);
    setPendingRequest({
      id: 'pending',
      family_id: row.family_id,
      family_name: row.name,
    });
    lastFamilyActionRef.current = Date.now();
    setIsJoining(false);
    closeJoinModal();
    await loadPendingRequest(userId);
  };

  const handleReviewRequest = async (requestId: string, approve: boolean) => {
    if (!family || family.role !== 'owner') return;
    if (approve && isFamilyAtCapacity) {
      setJoinRequestsError(`Family already has ${FAMILY_MEMBER_LIMIT} members.`);
      return;
    }

    setJoinRequestsError(null);

    const { error } = await supabase.rpc('review_join_request', {
      request_id: requestId,
      approve,
    });

    if (error) {
      setJoinRequestsError(
        error.message ? `Unable to update request: ${error.message}` : 'Unable to update request.'
      );
      return;
    }

    await loadJoinRequests(family.id);
    await loadMembers(family.id);
  };

  const handleDeleteFamily = async () => {
    if (!family) return;
    if (family.role !== 'owner') {
      setDeleteFamilyError('Only the family owner can delete this family.');
      return;
    }

    setIsDeletingFamily(true);
    setDeleteFamilyError(null);

    const response = await fetch('/api/family/delete', {
      method: 'POST',
    });

    if (!response.ok) {
      const payload: { message?: string } = await response.json().catch(() => ({}));
      setDeleteFamilyError(payload.message ?? 'Unable to delete the family. Please try again.');
      setIsDeletingFamily(false);
      return;
    }

    setIsDeleteFamilyOpen(false);
    setIsDeletingFamily(false);
    setIsJoinRequestsOpen(false);
    setIsInviteOpen(false);
    setJoinRequests([]);
    setMembers([]);
    setPendingJoinFamily(null);
    setPendingRequest(null);
    setFamily(null);
    setPageMessage('Your family has been deleted.');
    lastFamilyActionRef.current = null;
    if (selectedMember) {
      closeMemberDetailsModal();
    }
    await loadFamily(userId);
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {family ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {family.name}&apos;s Family
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Managed by {members.find((m) => m.role === 'owner')?.name ?? 'Owner'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openInviteModal}
                disabled={family.role !== 'owner' || isFamilyAtCapacity}
                title={
                  family.role !== 'owner'
                    ? 'Only the owner can invite members.'
                    : isFamilyAtCapacity
                    ? `Family limit of ${FAMILY_MEMBER_LIMIT} reached.`
                    : undefined
                }
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                Invite Member
              </button>
              {family.role === 'owner' ? (
                <>
                  <button
                    type="button"
                    onClick={openJoinRequestsModal}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 transition bg-white"
                  >
                    Join Requests{joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}
                    {joinRequests.length > 0 ? (
                      <span className="relative ml-2 inline-flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={openDeleteFamilyModal}
                    className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300 hover:text-rose-700 transition"
                  >
                    Delete Family
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">Family</h1>
            <p className="text-sm text-slate-500">
              Create a family or join one to share care updates.
            </p>
          </header>
        )}

        {pageMessage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {pageMessage}
          </div>
        ) : null}

        {(pendingJoinFamily || pendingRequest) && !family ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Your request to join {(pendingRequest?.family_name ?? pendingJoinFamily) || 'this family'}
            &apos;s Family has been sent.
            You&apos;ll see the family once the owner approves it (requests expire after 24 hours).
          </div>
        ) : null}

        {(!isAuthReady || (isLoading && !family)) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-600">
            Loading your family…
          </div>
        ) : family ? (
          <>
            <div className="grid gap-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Family Members</h3>
                    <p className="text-sm text-slate-500">
                      Everyone currently in this family.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {members.length}
                  </span>
                </div>
                {membersLoading ? (
                  <p className="mt-4 text-sm text-slate-500">Loading members…</p>
                ) : membersError ? (
                  <p className="mt-4 text-sm text-rose-600">{membersError}</p>
                ) : members.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No members yet. Invite someone to get started.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {members.map((member) => (
                      <li
                        key={member.user_id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-500">
                            {member.role === 'owner' ? 'Owner' : 'Member'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.user_id !== userId ? (
                            <button
                              type="button"
                              onClick={() => setSelectedMember(member)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                            >
                              View
                            </button>
                          ) : null}
                          {member.role === 'owner' ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                              Owner
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-slate-600 text-base">
              You are not a part of any family, create one now or join a family.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
              >
                Create Your Family
              </button>
              <button
                type="button"
                onClick={openJoinModal}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 transition"
              >
                Join a Family
              </button>
            </div>
          </div>
        )}
      </div>

      {isCreateOpen ? (
        <Modal onClose={closeCreateModal}>
          {createdFamily ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Family created</h2>
                <p className="text-sm text-slate-500">
                  Share this invite code with the people you want to add.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                <span className="font-mono text-lg tracking-[0.3em] text-slate-800">
                  {createdInviteCode ?? '—'}
                </span>
                <button
                  type="button"
                  onClick={() => createdInviteCode && handleCopy(createdInviteCode)}
                  disabled={!createdInviteCode}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Copy
                </button>
              </div>
              {createError ? (
                <p className="text-sm text-rose-600">{createError}</p>
              ) : null}
              {inviteMessage ? (
                <p className="text-xs text-slate-500">{inviteMessage}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create your family</h2>
                <p className="text-sm text-slate-500">You can create a single family only.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Family Name</label>
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="e.g. The Johnsons"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <p className="text-xs text-slate-500">
                  Pick a name between 2 and 50 characters.
                </p>
              </div>
              {createError ? (
                <p className="text-sm text-rose-600">{createError}</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      ) : null}

      {isJoinOpen ? (
        <Modal onClose={closeJoinModal}>
          {!joinPreview ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Join a family</h2>
                <p className="text-sm text-slate-500">Enter your unique family invite code.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Unique Family Code</label>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="ENTER CODE"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 uppercase tracking-widest outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <p className="text-xs text-slate-500">Codes are 6–12 characters.</p>
              </div>
              {joinError ? <p className="text-sm text-rose-600">{joinError}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeJoinModal}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleJoinPreview}
                  disabled={isJoining}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isJoining ? 'Checking…' : 'Continue'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Confirm join</h2>
                <p className="text-sm text-slate-500">
                  You are about to request to join {joinPreview.name}&apos;s Family.
                </p>
              </div>
              {joinError ? <p className="text-sm text-rose-600">{joinError}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setJoinPreview(null);
                    setPreviewCode(null);
                    setJoinError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleJoinConfirm}
                  disabled={isJoining}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isJoining ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      ) : null}

      {isInviteOpen && family ? (
        <Modal onClose={closeInviteModal}>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Invite member</h2>
              <p className="text-sm text-slate-500">
                Share this invite code to add a family member.
              </p>
            </div>
            {isInviteLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Generating a fresh invite code…
              </div>
            ) : inviteCode ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                <span className="font-mono text-lg tracking-[0.3em] text-slate-800">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(inviteCode)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
                >
                  Copy
                </button>
              </div>
            ) : inviteError ? null : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No active invite code is available right now.
              </div>
            )}
            {inviteError ? (
              <p className="text-sm text-rose-600">{inviteError}</p>
            ) : null}
            {inviteMessage ? (
              <p className="text-xs text-slate-500">{inviteMessage}</p>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeInviteModal}
                className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {isJoinRequestsOpen && family ? (
        <Modal onClose={closeJoinRequestsModal}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Join Requests</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Approve or reject new members. Requests expire after 24 hours.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {joinRequests.length}
              </span>
            </div>
            {joinRequestsLoading ? (
              <p className="text-sm text-slate-500">Loading requests…</p>
            ) : joinRequestsError ? (
              <p className="text-sm text-rose-600">{joinRequestsError}</p>
            ) : joinRequests.length === 0 ? (
              <p className="text-sm text-slate-500">
                No pending requests right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {joinRequests.map((request) => (
                  <li
                    key={request.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {request.display_name}
                      </p>
                      <p className="text-xs text-slate-500">Wants to join</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewRequest(request.id, true)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewRequest(request.id, false)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      ) : null}

      {isDeleteFamilyOpen && family ? (
        <Modal onClose={closeDeleteFamilyModal}>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Delete family</h2>
              <p className="text-sm text-slate-500 mt-1">
                Deleting a family cannot be undone. You and your family members will be removed
                from the family and you will no longer have access to each other&apos;s info.
              </p>
            </div>
            {deleteFamilyError ? (
              <p className="text-sm text-rose-600">{deleteFamilyError}</p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteFamilyModal}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFamily}
                disabled={isDeletingFamily}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingFamily ? 'Deleting…' : 'Delete Family'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {selectedMember ? (
        <Modal onClose={closeMemberDetailsModal} className="max-w-3xl h-[85vh] overflow-hidden flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 pt-1">
            <h2 className="text-xl font-semibold text-slate-900 pr-8 shrink-0">
              {selectedMember.name}&apos;s Details
            </h2>

            <div className="flex rounded-xl border border-slate-200 p-1.5 bg-slate-100/80 shrink-0 mt-4">
              {(['personal', 'appointments', 'medications', 'vault'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMemberDetailsTab(tab)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-[0.98] ${
                    memberDetailsTab === tab
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab === 'personal'
                    ? 'Personal'
                    : tab === 'appointments'
                    ? 'Appointments'
                    : tab === 'medications'
                    ? 'Medications'
                    : 'Vault'}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-[280px] flex-1 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/50 shadow-inner">
              {memberDetailsTab === 'vault' ? (
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'reports', 'prescriptions', 'insurance', 'bills'] as const).map(
                        (category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setVaultCategory(category)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              vaultCategory === category
                                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-white/70'
                            }`}
                          >
                            {vaultCategoryLabels[category]}
                          </button>
                        )
                      )}
                    </div>
                    <div className="ml-auto w-full sm:w-56">
                      <input
                        type="text"
                        value={vaultSearchQuery}
                        onChange={(event) => setVaultSearchQuery(event.target.value)}
                        placeholder="Search files"
                        className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                  </div>
                  {vaultLoading ? (
                    <p className="text-sm text-slate-500">Loading vault files…</p>
                  ) : vaultError ? (
                    <p className="text-sm text-rose-600">{vaultError}</p>
                  ) : vaultFiles.filter((file) =>
                      file.name.toLowerCase().includes(vaultSearchQuery.trim().toLowerCase())
                    ).length === 0 ? (
                    <p className="text-sm text-slate-500">No files in this vault.</p>
                  ) : (
                    <ul className="space-y-2">
                      {vaultFiles
                        .filter((file) =>
                          file.name
                            .toLowerCase()
                            .includes(vaultSearchQuery.trim().toLowerCase())
                        )
                        .map((file) => (
                        <li
                          key={`${file.folder}:${file.name}`}
                          className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {vaultCategoryLabels[file.folder]} · {formatVaultDate(file.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleVaultPreview(file)}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Open
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : memberDetailsLoading ? (
                <div className="h-full min-h-[280px] flex items-center justify-center text-slate-500 text-sm">
                  Loading details…
                </div>
              ) : memberDetailsError ? (
                <div className="h-full min-h-[280px] flex items-center justify-center px-4">
                  <p className="text-sm text-rose-600">{memberDetailsError}</p>
                </div>
              ) : memberDetailsTab === 'personal' && memberDetails ? (
              <div className="p-4 space-y-4">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500 font-medium">Name</dt>
                    <dd className="text-slate-900 mt-0.5">{memberDetails.personal?.display_name?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Number</dt>
                    <dd className="text-slate-900 mt-0.5">{memberDetails.personal?.phone?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Age</dt>
                    <dd className="text-slate-900 mt-0.5">{memberDetails.health?.age != null ? String(memberDetails.health.age) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Blood Group</dt>
                    <dd className="text-slate-900 mt-0.5">{memberDetails.health?.blood_group?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">BMI</dt>
                    <dd className="text-slate-900 mt-0.5">{memberDetails.health?.bmi != null ? String(memberDetails.health.bmi) : '—'}</dd>
                  </div>
                </dl>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Current medical status</h3>
                  <div className="space-y-2 text-sm">
                    {memberDetails.health?.current_diagnosed_condition?.length ? (
                      <p><span className="text-slate-500">Conditions:</span> {memberDetails.health.current_diagnosed_condition.join(', ')}</p>
                    ) : null}
                    {memberDetails.health?.allergies?.length ? (
                      <p><span className="text-slate-500">Allergies:</span> {memberDetails.health.allergies.join(', ')}</p>
                    ) : null}
                    {memberDetails.health?.ongoing_treatments?.length ? (
                      <p><span className="text-slate-500">Ongoing treatments:</span> {memberDetails.health.ongoing_treatments.join(', ')}</p>
                    ) : null}
                    {!(memberDetails.health?.current_diagnosed_condition?.length || memberDetails.health?.allergies?.length || memberDetails.health?.ongoing_treatments?.length) && (
                      <p className="text-slate-500">No current medical status recorded.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Past medical history</h3>
                  <div className="space-y-2 text-sm">
                    {memberDetails.health?.previous_diagnosed_conditions?.length ? (
                      <p><span className="text-slate-500">Previous conditions:</span> {memberDetails.health.previous_diagnosed_conditions.join(', ')}</p>
                    ) : null}
                    {memberDetails.health?.past_surgeries?.length ? (
                      <p><span className="text-slate-500">Past surgeries:</span> {memberDetails.health.past_surgeries.map((s) => `${s.name} (${s.month}/${s.year})`).join(', ')}</p>
                    ) : null}
                    {memberDetails.health?.childhood_illness?.length ? (
                      <p><span className="text-slate-500">Childhood illness:</span> {memberDetails.health.childhood_illness.join(', ')}</p>
                    ) : null}
                    {memberDetails.health?.long_term_treatments?.length ? (
                      <p><span className="text-slate-500">Long-term treatments:</span> {memberDetails.health.long_term_treatments.join(', ')}</p>
                    ) : null}
                    {!(memberDetails.health?.previous_diagnosed_conditions?.length || memberDetails.health?.past_surgeries?.length || memberDetails.health?.childhood_illness?.length || memberDetails.health?.long_term_treatments?.length) && (
                      <p className="text-slate-500">No past medical history recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : memberDetailsTab === 'appointments' && memberDetails ? (
              <div className="p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Past appointments (last 7 days)</h3>
                  {(() => {
                    const now = new Date();
                    const today = formatLocalDate(now);
                    const pastCutoff = new Date(now);
                    pastCutoff.setDate(pastCutoff.getDate() - 7);
                    const pastCutoffStr = formatLocalDate(pastCutoff);
                    const past = (memberDetails.appointments || []).filter(
                      (a) => {
                        const dateKey = normalizeAppointmentDate(a.date);
                        return dateKey && dateKey >= pastCutoffStr && dateKey <= today;
                      }
                    );
                    past.sort((a, b) => {
                      const dateA = normalizeAppointmentDate(a.date);
                      const dateB = normalizeAppointmentDate(b.date);
                      if (!dateA && !dateB) return 0;
                      if (!dateA) return 1;
                      if (!dateB) return -1;
                      return dateA === dateB ? (a.time || '').localeCompare(b.time || '') : dateA.localeCompare(dateB);
                    });
                    if (past.length === 0) {
                      return <p className="text-sm text-slate-500">No past appointments in the last 7 days.</p>;
                    }
                    return (
                      <ul className="space-y-2">
                        {past.map((apt) => (
                          <li key={apt.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-medium text-slate-800">{apt.title}</span>
                            <span className="text-slate-500 mx-2">·</span>
                            <span>{normalizeAppointmentDate(apt.date) || apt.date || '—'}</span>
                            <span className="text-slate-500 mx-2">·</span>
                            <span>{apt.time || '—'}</span>
                            {apt.type ? <span className="text-slate-500 ml-2">({apt.type})</span> : null}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Upcoming appointments (next 7 days)</h3>
                  {(() => {
                    const now = new Date();
                    const today = formatLocalDate(now);
                    const futureCutoff = new Date(now);
                    futureCutoff.setDate(futureCutoff.getDate() + 7);
                    const futureCutoffStr = formatLocalDate(futureCutoff);
                    const upcoming = (memberDetails.appointments || []).filter(
                      (a) => {
                        const dateKey = normalizeAppointmentDate(a.date);
                        return dateKey && dateKey > today && dateKey <= futureCutoffStr;
                      }
                    );
                    upcoming.sort((a, b) => {
                      const dateA = normalizeAppointmentDate(a.date);
                      const dateB = normalizeAppointmentDate(b.date);
                      if (!dateA && !dateB) return 0;
                      if (!dateA) return 1;
                      if (!dateB) return -1;
                      return dateA === dateB ? (a.time || '').localeCompare(b.time || '') : dateA.localeCompare(dateB);
                    });
                    if (upcoming.length === 0) {
                      return <p className="text-sm text-slate-500">No upcoming appointments in the next 7 days.</p>;
                    }
                    return (
                      <ul className="space-y-2">
                        {upcoming.map((apt) => (
                          <li key={apt.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            <span className="font-medium text-slate-800">{apt.title}</span>
                            <span className="text-slate-500 mx-2">·</span>
                            <span>{normalizeAppointmentDate(apt.date) || apt.date || '—'}</span>
                            <span className="text-slate-500 mx-2">·</span>
                            <span>{apt.time || '—'}</span>
                            {apt.type ? <span className="text-slate-500 ml-2">({apt.type})</span> : null}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            ) : memberDetailsTab === 'medications' && memberDetails ? (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Ongoing medications</h3>
                {(() => {
                  const now = new Date();
                  const ongoing = (memberDetails.medications || []).filter((med) => {
                    if (!med.endDate) return true;
                    const end = new Date(med.endDate);
                    if (Number.isNaN(end.getTime())) return true;
                    return now <= end;
                  });
                  if (ongoing.length === 0) {
                    return <p className="text-sm text-slate-500">No ongoing medications.</p>;
                  }
                  return (
                    <ul className="space-y-3">
                      {ongoing.map((med) => (
                        <li key={med.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <p className="font-semibold text-slate-800">{med.name}</p>
                          <p className="text-slate-600 mt-1">Dosage: {med.dosage || '—'}</p>
                          <p className="text-slate-600">Frequency: {med.frequency || '—'}</p>
                          {med.purpose ? <p className="text-slate-500 mt-1">Purpose: {med.purpose}</p> : null}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {vaultPreviewFile ? (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm">
          <div className="absolute inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {vaultPreviewFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {vaultCategoryLabels[vaultPreviewFile.folder]}
                </p>
              </div>
              <button
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                onClick={() => {
                  setVaultPreviewFile(null);
                  setVaultPreviewUrl(null);
                }}
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {vaultPreviewLoading && (
                <div className="text-sm text-slate-500">Loading preview…</div>
              )}
              {!vaultPreviewLoading && vaultPreviewUrl && isVaultImageFile(vaultPreviewFile.name) && (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={vaultPreviewUrl}
                    alt={vaultPreviewFile.name}
                    className="max-h-full max-w-full rounded-xl border border-slate-100"
                  />
                </div>
              )}
              {!vaultPreviewLoading && vaultPreviewUrl && isVaultPdfFile(vaultPreviewFile.name) && (
                <iframe
                  src={vaultPreviewUrl}
                  title={vaultPreviewFile.name}
                  className="w-full h-full rounded-xl border border-slate-100"
                />
              )}
              {!vaultPreviewLoading &&
                vaultPreviewUrl &&
                !isVaultImageFile(vaultPreviewFile.name) &&
                !isVaultPdfFile(vaultPreviewFile.name) && (
                  <div className="text-sm text-slate-500">
                    Preview not available for this file type.
                  </div>
                )}
              {!vaultPreviewLoading && !vaultPreviewUrl && (
                <div className="text-sm text-slate-500">Preview unavailable.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
