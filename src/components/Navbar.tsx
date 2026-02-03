'use client';

import { LogOut, Home, User, Folder, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/createClient';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isOnboarding = pathname === '/app/health-onboarding';
  const effectiveCollapsed = isOnboarding ? false : collapsed;
  const navItems = [
    { label: 'Home', href: '/app/homepage', icon: Home },
    { label: 'Profile', href: '/app/profilepage', icon: User },
    { label: 'Vault', href: '/app/vaultpage', icon: Folder },
    { label: 'Care Circle', href: '/app/carecircle', icon: Users },
  ];

  useEffect(() => {
    const stored = window.localStorage.getItem('vytara_nav_collapsed');
    if (stored) setCollapsed(stored === '1');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('vytara_nav_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const clearSupabaseAuthCookies = () => {
    if (typeof document === "undefined") return;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;
    let projectRef = "";
    try {
      projectRef = new URL(supabaseUrl).hostname.split(".")[0] ?? "";
    } catch {
      return;
    }
    if (!projectRef) return;
    const storageKey = `sb-${projectRef}-auth-token`;
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .forEach((cookie) => {
        const name = cookie.split("=")[0];
        if (name.startsWith(storageKey)) {
          document.cookie = `${name}=; Max-Age=0; path=/`;
        }
      });
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.refresh_token) return;
        try {
          const stored = window.localStorage.getItem("vytara_remembered_account");
          if (!stored) return;
          const parsed = JSON.parse(stored) as {
            userId?: string;
            refreshToken?: string;
            accessToken?: string;
          };
          if (parsed?.userId && parsed.userId === session.user.id) {
            window.localStorage.setItem(
              "vytara_remembered_account",
              JSON.stringify({
                ...parsed,
                refreshToken: session.refresh_token,
                accessToken: session.access_token,
              })
            );
          }
        } catch {
          // ignore local storage errors
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b border-teal-900/20 bg-gradient-to-r from-teal-950 via-slate-950 to-slate-950 text-white md:hidden ${
          isOnboarding ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            className="flex items-center gap-2 text-left"
            onClick={() => router.push('/app/homepage')}
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md p-2">
              <div className="w-full h-full bg-teal-600 rounded-full"></div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-teal-200/70">Vytara</p>
              <p className="text-sm font-semibold leading-tight">Patient Hub</p>
            </div>
          </button>
          <button
            onClick={async () => {
              try {
                const stored = window.localStorage.getItem("vytara_remembered_account");
                if (stored) {
                  const parsed = JSON.parse(stored) as {
                    refreshToken?: string;
                  };
                  const { data } = await supabase.auth.getSession();
                  if (data.session?.refresh_token && parsed) {
                    window.localStorage.setItem(
                      "vytara_remembered_account",
                      JSON.stringify({
                        ...parsed,
                        refreshToken: data.session.refresh_token,
                      })
                    );
                  }
                }
              } catch {
                // ignore local storage errors
              }
              clearSupabaseAuthCookies();
              await supabase.auth.signOut({ scope: "local" });
              router.push('/auth/login');
            }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-red-200/90 hover:bg-white/10 hover:text-red-100 transition"
          >
            Logout
          </button>
        </div>
        <nav className="flex flex-wrap gap-2 px-4 pb-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-teal-500/30 text-white'
                    : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        {isOnboarding && (
          <div className="px-4 pb-3 text-xs text-teal-100/80">
            Complete onboarding to unlock navigation.
          </div>
        )}
      </header>

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-teal-900/20 bg-gradient-to-b from-teal-950 via-slate-950 to-slate-950 text-white transition-[width] duration-200 md:block ${
          effectiveCollapsed ? 'w-20' : 'w-64'
        } ${isOnboarding ? 'pointer-events-none opacity-70' : ''}`}
      >
        <div className="flex h-full flex-col px-3 py-6">
          <div className="flex items-center justify-between px-1">
            <button
              className="flex items-center gap-3 text-left"
              onClick={() => router.push('/app/homepage')}
            >
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-md p-2">
                <div className="w-full h-full bg-teal-600 rounded-full"></div>
              </div>
              {!effectiveCollapsed && (
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-teal-200/70">
                    Vytara
                  </p>
                  <p className="text-lg font-semibold leading-tight">Patient Hub</p>
                </div>
              )}
            </button>
            <button
              onClick={() => setCollapsed((v) => !v)}
              title={effectiveCollapsed ? 'Open navbar' : 'Close navbar'}
              className="ml-auto rounded-lg p-2 text-teal-100/70 hover:bg-white/10 hover:text-white transition"
            >
              {effectiveCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="mt-8 flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-teal-500/20 text-white shadow-sm'
                      : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
                  }`}
                  title={effectiveCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {!effectiveCollapsed && item.label}
                </button>
              );
            })}
          </nav>

          {isOnboarding && !effectiveCollapsed && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-teal-100/80">
              Complete onboarding to unlock navigation.
            </div>
          )}

          <button
            onClick={async () => {
              try {
                const stored = window.localStorage.getItem("vytara_remembered_account");
                if (stored) {
                  const parsed = JSON.parse(stored) as {
                    refreshToken?: string;
                  };
                  const { data } = await supabase.auth.getSession();
                  if (data.session?.refresh_token && parsed) {
                    window.localStorage.setItem(
                      "vytara_remembered_account",
                      JSON.stringify({
                        ...parsed,
                        refreshToken: data.session.refresh_token,
                      })
                    );
                  }
                }
              } catch {
                // ignore local storage errors
              }
              clearSupabaseAuthCookies();
              await supabase.auth.signOut({ scope: "local" });
              router.push('/auth/login');
            }}
            title={effectiveCollapsed ? 'Logout' : undefined}
            className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-200/90 hover:bg-white/10 hover:text-red-100 transition"
          >
            <LogOut className="w-4 h-4" />
            {!effectiveCollapsed && 'Logout'}
          </button>
        </div>
      </aside>
    </>
  );
}
