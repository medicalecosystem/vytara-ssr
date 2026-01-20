'use client';

import { useEffect, useMemo, useState } from 'react';
import { Shield, UserPlus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/createClient';

type CareCircleStatus = 'pending' | 'active' | 'revoked';

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
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer';
};

type PendingInvite = {
  id: string;
  contact: string;
  sentAt: string;
};

export default function CareCirclePage() {
  const [circleData, setCircleData] = useState<CareCircleData>({
    circleName: 'Loading…',
    ownerName: '',
    myCircleMembers: [],
    circlesImIn: [],
    currentUserRole: 'viewer',
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteContact, setInviteContact] = useState('');

  useEffect(() => {
    async function loadCareCircle() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const displayName =
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        user?.email?.split('@')[0] ??
        'Your';
      const circleName = `${displayName}'s Care Circle`;

      setCircleData({
        circleName,
        ownerName: displayName,
        myCircleMembers: [],
        circlesImIn: [],
        currentUserRole: 'owner',
      });
      setCurrentUserId(user?.id ?? null);
    }

    loadCareCircle();
  }, []);

  const isAdmin = useMemo(
    () => ['owner', 'admin'].includes(circleData.currentUserRole),
    [circleData.currentUserRole]
  );

  const handleRemove = (memberId: string) => {
    setCircleData((prev) => ({
      ...prev,
      myCircleMembers: prev.myCircleMembers.filter((member) => member.id !== memberId),
    }));
  };

  const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inviteContact.trim();
    if (!trimmed) {
      return;
    }

    setPendingInvites((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        contact: trimmed,
        sentAt: new Date().toISOString(),
      },
    ]);
    setInviteContact('');
    setIsInviteOpen(false);
  };

  const activeMembers = useMemo(
    () =>
      circleData.myCircleMembers.filter(
        (member) => member.status === 'active' && member.id !== currentUserId
      ),
    [circleData.myCircleMembers, currentUserId]
  );

  const activeCirclesImIn = useMemo(
    () => circleData.circlesImIn.filter((member) => member.status === 'active'),
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
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-md shadow-teal-900/20 hover:bg-teal-700 transition"
            >
              <UserPlus className="h-5 w-5" />
              Invite member
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-white/20 shadow-xl shadow-teal-900/10 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
              <p className="text-slate-500 text-sm">
                Manage roles, invitations, and access for your care team.
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-4 py-2">
                <Shield className="h-4 w-4" />
                Admin controls enabled
              </div>
            )}
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
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
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
                    Circles where you have access to help someone else.
                  </p>
                </div>
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
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Send invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
