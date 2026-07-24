'use client';

import { useAuth } from '@/hooks/useAuth';
import { useStudentStore } from '@/stores/studentStore';
import { Navbar } from '@/components/shared/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, LogOut, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile } = useStudentStore();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-8 pb-32">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-[#1e3a8a]" />
          Settings
        </h1>

        <div className="space-y-6">
          {/* Profile Summary Card */}
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-600 p-6 text-white flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 shrink-0 shadow-inner">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.user?.firstName} {profile?.user?.lastName || 'Student'}</h2>
                <p className="text-blue-100 text-sm font-medium opacity-90">{user?.email}</p>
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/20 tracking-wider uppercase">
                  {user?.role?.replace('_', ' ')}
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
                    <p className="text-xs text-slate-500">Update password and 2FA</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
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
              SISP Mobile v1.0.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
