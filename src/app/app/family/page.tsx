'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, UserPlus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/createClient';

type FamilyStatus = 'pending' | 'accepted' | 'declined';

type FamilyMember = {
  id: string;
  name: string;
  status: FamilyStatus;
};

type FamilyData = {
  familyName: string;
  ownerName: string;
  myFamilyMembers: FamilyMember[];
  familiesImIn: FamilyMember[];
};

type PendingInvite = {
  id: string;
  contact: string;
  sentAt: string;
};

export default function FamilyPage() {
  const [familyData, setFamilyData] = useState<FamilyData>({
    familyName: 'Loading…',
    ownerName: '',
    myFamilyMembers: [],
    familiesImIn: [],
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteContact, setInviteContact] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMyPendingInvites, setShowMyPendingInvites] = useState(false);
  const [showIncomingPendingInvites, setShowIncomingPendingInvites] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const openTarget = params.get('open');
    if (openTarget === 'incoming-invites') {
      setShowIncomingPendingInvites(true);
      setShowMyPendingInvites(false);
    }
  }, []);

  const loadFamily = useCallback(async () => {
    try {
      setLoadError(null);
      
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        setLoadError('Please sign in to view your family.');
        return;
      }

      const user = session.user;
      setCurrentUserId((prev) => (prev === user.id ? prev : user.id));

      let displayName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.phone ??
        'Your';

      const { data: personal } = await supabase
        .from('personal')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (personal?.display_name) {
        displayName = personal.display_name;
      }

      const familyName = `${displayName}'s Family`;

      const response = await fetch('/api/family/links', { 
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unable to load family data.';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
        }
        
        console.error('Failed to load family links:', errorMessage);
        setLoadError(errorMessage);
        
        setFamilyData({
          familyName,
          ownerName: displayName,
          myFamilyMembers: [],
          familiesImIn: [],
        });
        return;
      }

      const linksData: {
        outgoing: Array<{
          id: string;
          memberId: string;
          status: FamilyStatus;
          displayName: string;
          createdAt: string;
        }>;
        incoming: Array<{
          id: string;
          memberId: string;
          status: FamilyStatus;
          displayName: string;
          createdAt: string;
        }>;
      } = await response.json();

      const myFamilyMembers = linksData.outgoing.map((link) => ({
        id: link.memberId,
        name: link.displayName,
        status: link.status,
      }));

      const familiesImIn = linksData.incoming.map((link) => ({
        id: link.memberId,
        name: link.displayName,
        status: link.status,
      }));

      const nextPendingInvites = linksData.outgoing
        .filter((link) => link.status === 'pending')
        .map((link) => ({
          id: link.id,
          contact: link.displayName,
          sentAt: link.createdAt,
        }));

      setPendingInvites(nextPendingInvites);

      setFamilyData({
        familyName,
        ownerName: displayName,
        myFamilyMembers,
        familiesImIn,
      });
    } catch (error) {
      console.error('Error loading family:', error);
      setLoadError('An unexpected error occurred while loading family data.');
    }
  }, []);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const handleRemove = async (memberId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('family_links')
        .delete()
        .eq('requester_id', currentUserId)
        .eq('recipient_id', memberId);

      if (error) {
        console.error('Error removing family member:', error);
        return;
      }

      await loadFamily();
    } catch (error) {
      console.error('Error removing family member:', error);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteContact.trim();
    if (!trimmed) return;

    if (!currentUserId) {
      setInviteError('Please sign in again to send invites.');
      return;
    }

    setIsSavingInvite(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: trimmed }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unable to send invite.';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
        }
        
        setInviteError(errorMessage);
        setIsSavingInvite(false);
        return;
      }

      setInviteContact('');
      setIsInviteOpen(false);
      setIsSavingInvite(false);
      await loadFamily();
    } catch (error) {
      console.error('Error sending invite:', error);
      setInviteError('An unexpected error occurred. Please try again.');
      setIsSavingInvite(false);
    }
  };

  const handleAcceptFamilyInvite = async (memberId: string) => {
    if (!currentUserId) return;
    
    await supabase
      .from('family_links')
      .update({ status: 'accepted' })
      .eq('recipient_id', currentUserId)
      .eq('requester_id', memberId);
    
    await loadFamily();
  };

  const handleDeclineFamilyInvite = async (memberId: string) => {
    if (!currentUserId) return;
    
    await supabase
      .from('family_links')
      .update({ status: 'declined' })
      .eq('recipient_id', currentUserId)
      .eq('requester_id', memberId);
    
    await loadFamily();
  };

  const activeMembers = useMemo(
    () => familyData.myFamilyMembers.filter(
      (m) => m.status === 'accepted' && m.id !== currentUserId
    ),
    [familyData.myFamilyMembers, currentUserId]
  );

  const pendingFamilyInvites = useMemo(
    () => familyData.familiesImIn.filter((member) => member.status === 'pending'),
    [familyData.familiesImIn]
  );

  const activeFamiliesImIn = useMemo(
    () => familyData.familiesImIn.filter((member) => member.status === 'accepted'),
    [familyData.familiesImIn]
  );

  const hasMyPendingInvites = pendingInvites.length > 0;
  const hasIncomingPendingInvites = pendingFamilyInvites.length > 0;

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        
        {/* Error Alert */}
        {loadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <p className="text-rose-600 text-sm">{loadError}</p>
          </div>
        )}

        {/* Header */}
        <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-teal-600 font-semibold">
                Family
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">
                {familyData.familyName}
              </h1>
              <p className="text-slate-500 mt-2">
                Managed by <span className="font-semibold text-slate-700">{familyData.ownerName}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
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

        {/* Two Column Layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* My Family */}
          <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                My Family
              </h2>
              <p className="text-slate-500 text-sm">
                Members you&apos;ve invited to your family.
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

          {/* Families I'm In */}
          <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Families I&apos;m In
              </h2>
              <p className="text-slate-500 text-sm">
                Families managed by others that you&apos;re part of.
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
                        {pendingFamilyInvites.length}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Active families
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {activeFamiliesImIn.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {activeFamiliesImIn.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      You are not part of any other families yet.
                    </p>
                  ) : (
                    activeFamiliesImIn.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <span className="font-medium text-slate-900">
                          {member.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* My Pending Invites Modal */}
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

      {/* Incoming Pending Invites Modal */}
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
              {pendingFamilyInvites.length === 0 ? (
                <p className="text-sm text-slate-500">
                  There are no pending invites.
                </p>
              ) : (
                pendingFamilyInvites.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>{member.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptFamilyInvite(member.id)}
                        className="inline-flex items-center justify-center rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineFamilyInvite(member.id)}
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

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Invite to your family
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
              Add a registered user by entering their phone number.
            </p>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Phone number
                <input
                  value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  placeholder="+91 98765 43210"
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
