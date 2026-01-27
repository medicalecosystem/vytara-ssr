'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Trash2, X } from 'lucide-react';
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

  const loadFamily = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;

    const user = data.user;
    const displayName =
      user.user_metadata?.full_name ??
      user.email?.split('@')[0] ??
      'Your';

    setCurrentUserId(user.id);

    const response = await fetch('/api/family/links', { cache: 'no-store' });
    if (!response.ok) return;

    const linksData = await response.json();

    setPendingInvites(
      linksData.outgoing
        .filter((l: any) => l.status === 'pending')
        .map((l: any) => ({
          id: l.id,
          contact: l.contact,
          sentAt: l.createdAt,
        }))
    );

    setFamilyData({
      familyName: `${displayName}'s Family`,
      ownerName: displayName,
      myFamilyMembers: linksData.outgoing,
      familiesImIn: linksData.incoming,
    });
  }, []);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const handleRemove = async (memberId: string) => {
    if (!currentUserId) return;

    await supabase
      .from('family_links')
      .delete()
      .eq('requester_id', currentUserId)
      .eq('recipient_id', memberId);

    loadFamily();
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteContact.trim()) return;

    setIsSavingInvite(true);
    setInviteError(null);

    const response = await fetch('/api/family/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: inviteContact.trim() }),
    });

    if (!response.ok) {
      const err = await response.json();
      setInviteError(err.message || 'Failed to send invite');
      setIsSavingInvite(false);
      return;
    }

    setInviteContact('');
    setIsInviteOpen(false);
    setIsSavingInvite(false);
    loadFamily();
  };

  const activeMembers = useMemo(
    () => familyData.myFamilyMembers.filter(m => m.status === 'accepted'),
    [familyData.myFamilyMembers]
  );

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-teal-600 font-semibold">
                Family
              </p>
              <h1 className="text-black text-3xl font-semibold mt-2">
                {familyData.familyName}
              </h1>
              <p className="text-slate-500 mt-2">
                Managed by <span className="font-semibold">{familyData.ownerName}</span>
              </p>
            </div>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-xl hover:bg-teal-700"
            >
              <UserPlus className="h-5 w-5" />
              Invite family member
            </button>
          </div>
        </section>

        {/* Members */}
        <section className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-black text-2xl font-semibold mb-4">Family Members</h2>

          {activeMembers.length === 0 ? (
            <p className="text-slate-500">No family members yet.</p>
          ) : (
            activeMembers.map(member => (
              <div
                key={member.id}
                className="flex justify-between items-center bg-slate-50 rounded-xl p-4 mb-2"
              >
                <p className="font-semibold">{member.name}</p>
                <button
                  onClick={() => handleRemove(member.id)}
                  className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center">
              <h3 className="text-black font-semibold text-lg">Invite family member</h3>
              <button onClick={() => setIsInviteOpen(false)}>
                <X />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <input
                value={inviteContact}
                onChange={e => setInviteContact(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border rounded-xl px-3 py-2"
              />

              {inviteError && (
                <p className="text-rose-600 text-sm">{inviteError}</p>
              )}

              <button
                type="submit"
                disabled={isSavingInvite}
                className="w-full bg-teal-600 text-white py-2 rounded-xl"
              >
                {isSavingInvite ? 'Sending…' : 'Send invite'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
