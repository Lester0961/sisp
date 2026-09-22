'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStudentStore } from '@/stores/studentStore';
import { Navbar } from '@/components/shared/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { User, Shield, LogOut, ChevronRight, Settings as SettingsIcon, MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile } = useStudentStore();
  const router = useRouter();
  const [sessions, setSessions] = useState<
    Array<{ id: string; createdAt: string; lastUsedAt: string | null; ipAddress: string | null; userAgent: string | null }>
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const profileMatchesSignedInUser = profile?.user?.email === user?.email;
  const displayName = profileMatchesSignedInUser && profile?.user
    ? `${profile.user.firstName} ${profile.user.lastName || ''}`.trim()
    : user?.email?.split('@')[0] || 'Account';
  const roleLabel = user?.role
    ? user.role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : 'Account';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await authApi.me();
        if (active) setSessions(me.activeSessions ?? []);
      } catch {
        if (active) setSessions([]);
      } finally {
        if (active) setSessionsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOutEverywhere = async () => {
    if (!confirm('Sign out of every device? You will need to log in again.')) return;
    setRevoking(true);
    try {
      const result = await authApi.logoutAll();
      toast.success(`Signed out of ${result.revoked} session(s).`);
      router.push('/login');
    } catch {
      toast.error('Could not revoke all sessions.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="portal-page">
      <Navbar />

      <main className="portal-main max-w-2xl pb-8">
        <div className="portal-page-header"><div><h1 className="portal-title flex items-center gap-2"><SettingsIcon className="size-6 text-[#0a439b]" strokeWidth={1.8} />Settings</h1><p className="portal-description mt-2">Manage your account and security preferences.</p></div></div>

        <div className="space-y-6">
          {/* Profile Summary Card */}
          <Card className="overflow-hidden border-[#dce7ef]">
            <div className="bg-[#102f49] p-6 text-white flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 shrink-0 shadow-inner">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{displayName}</h2>
                <p className="text-blue-100 text-sm font-medium opacity-90">{user?.email}</p>
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/20 tracking-wider uppercase">
                  {roleLabel}
                </div>
              </div>
            </div>
          </Card>

          {/* Account Settings */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Account</h3>
            <Card className="border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
              <button type="button" className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left" onClick={() => router.push('/force-password-change')}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-[#1e3a8a]">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Security & Password</p>
                    <p className="text-xs text-slate-500">Change your password (other sessions are revoked)</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            </Card>
          </div>

          {/* Active sessions */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Active sessions</h3>
            <Card className="border-slate-100 shadow-sm overflow-hidden">
              {sessionsLoading ? (
                <p className="p-4 text-xs text-slate-500">Loading sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">No active sessions found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <li key={session.id} className="flex items-start gap-3 p-4">
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                        <MonitorSmartphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          {session.userAgent?.slice(0, 60) || 'Unknown device'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {session.ipAddress || 'unknown IP'} · started{' '}
                          {new Date(session.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 p-4">
                <Button variant="outline" className="w-full" onClick={signOutEverywhere} disabled={revoking}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out of all devices
                </Button>
              </div>
            </Card>
          </div>

          {/* Logout */}
          <div className="pt-4">
            <Button
              variant="destructive"
              className="w-full h-12 rounded-xl font-bold shadow-sm"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <p className="text-center text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-widest">
              SISP v1.1.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
