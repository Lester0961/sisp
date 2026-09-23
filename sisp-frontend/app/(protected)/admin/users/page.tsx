'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { curriculaApi, Program } from '@/lib/api/curricula';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { PageFooter } from '@/components/shared/PageFooter';
import {
  Users,
  Archive,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  UserPlus,
  Loader2,
  Lock,
  Unlock,
  LogOut,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminUsersPage() {
  useAuth();
  const {
    users,
    totalUsers,
    currentPage,
    isLoading,
    fetchUsers,
    updateUserRole,
    deactivateUser,
    activateUser,
    archiveUser,
    revokeUserSessions,
    createUser,
  } = useAdminStore();

  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleName, setRoleName] = useState('faculty');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programId, setProgramId] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Success details state
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    tempPass: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetchUsers(page, 5);
  }, [page, fetchUsers]);

  useEffect(() => {
    let active = true;
    setProgramsLoading(true);
    void curriculaApi.getPrograms()
      .then((items) => {
        if (!active) return;
        setPrograms(items);
        setProgramId(items[0]?.id || '');
      })
      .catch(() => {
        if (active) toast.error('Could not load academic programs. Refresh and try again.');
      })
      .finally(() => {
        if (active) setProgramsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      toast.error('Please fill out all required fields');
      return;
    }
    setCreating(true);
    try {
      const res = await createUser({
        email,
        firstName,
        lastName,
        roleName,
      });

      // Show success modal credentials
      setCreatedCredentials({
        email,
        tempPass: res.temporaryPassword || '',
        role: roleName,
      });

      toast.success('Account created successfully!');
      
      // Clear inputs
      setEmail('');
      setFirstName('');
      setLastName('');
      setStudentNumber('');
    } catch (err: unknown) {
      const errMsg = (err as any).response?.data?.message ?? 'Failed to create user account';
      toast.error(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (confirm('Are you sure you want to deactivate this user? Their active session will be revoked immediately.')) {
      try {
        await deactivateUser(userId);
        toast.success('User account deactivated.');
      } catch {
        toast.error('Failed to deactivate user.');
      }
    }
  };

  const handleActivate = async (userId: string) => {
    try {
      await activateUser(userId);
      toast.success('User account reactivated.');
    } catch {
      toast.error('Failed to reactivate user.');
    }
  };

  const handleArchive = async (userId: string) => {
    if (
      confirm(
        'Archive this account? It will be deactivated, its active sessions revoked, and it will be hidden from normal account operations. Academic and audit history are preserved.',
      )
    ) {
      try {
        await archiveUser(userId);
        toast.success('User account archived.');
      } catch {
        toast.error('Failed to archive user.');
      }
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    if (confirm('Sign this user out of every device?')) {
      try {
        const revoked = await revokeUserSessions(userId);
        toast.success(`Revoked ${revoked} active session(s).`);
      } catch {
        toast.error('Failed to revoke sessions.');
      }
    }
  };

  const handleRoleChange = async (userId: string, roleName: string) => {
    try {
      await updateUserRole(userId, roleName);
      toast.success('User role updated successfully.');
    } catch {
      toast.error('Failed to update role.');
    }
  };

  const roleOptions = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'dean', label: 'Academic Dean' },
    { value: 'registrar', label: 'Registrar' },
    { value: 'treasury', label: 'Treasury / Accounting' },
    { value: 'sys_admin', label: 'System Administrator' },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
        
        {/* Welcome Section */}
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2">
              <Users className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              User accounts
            </h1>
            <p className="portal-description mt-2">
              Create accounts, adjust roles, and manage access for students and staff.
            </p>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Create User Account
            </Button>
          </div>
        </div>

        {/* User Directory Table Card */}
        <div className="portal-surface space-y-4 p-5">
          <div className="flex flex-col items-start gap-4 border-b border-[#e8f0f5] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#102f49]">Account directory</h2>
              <p className="mt-1 text-xs text-[#587387]">Roles, account status, and access controls.</p>
            </div>
          </div>

          {/* Mobile: card records (NEXT 12) so actions never require horizontal scrolling */}
          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <p className="py-6 text-center text-xs font-medium text-slate-400">
                Retrieving active user records...
              </p>
            ) : users.length > 0 ? (
              users.map((u) => (
                <article
                  key={u.id}
                  className="space-y-3 rounded-xl border border-[#e8f0f5] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#102f49]">
                        {u.firstName || 'N/A'} {u.lastName || 'N/A'}
                      </p>
                      <p className="truncate text-xs text-[#587387]">{u.email}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        u.isActive
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : 'border-rose-100 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#c8d9e7] bg-[#eef6fc] px-2 py-0.5 text-[10px] font-semibold text-[#0a439b]">
                      {u.role?.name === 'live_agent' ? 'Live Agent (retired)' : u.role?.name || 'unknown'}
                    </span>
                    {u.role?.name !== 'live_agent' && (
                      <select
                        defaultValue={u.role?.name || ''}
                        onChange={(event) => {
                          const nextRole = event.target.value;
                          const currentRole = u.role?.name || '';
                          if (nextRole === currentRole) return;
                          if (
                            !window.confirm(
                              `Change ${u.email} to the ${roleOptions.find((option) => option.value === nextRole)?.label || nextRole} role?`,
                            )
                          ) {
                            event.currentTarget.value = currentRole;
                            return;
                          }
                          void handleRoleChange(u.id, nextRole);
                        }}
                        className="rounded-md border border-slate-200 bg-slate-50 p-1 text-[11px] text-slate-700 transition hover:border-slate-300 focus:outline-none"
                      >
                        {roleOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {u.role?.name === 'live_agent' ? (
                    <p className="col-span-2 text-xs text-slate-500">
                      Legacy account access is retired. Historical records are retained.
                    </p>
                  ) : <div className="grid grid-cols-2 gap-2">
                    {u.isActive ? (
                      <Button
                        onClick={() => handleDeactivate(u.id)}
                        className="border border-amber-100 bg-amber-50 text-[10px] font-bold text-amber-700 transition-all hover:bg-amber-100"
                      >
                        <Lock className="mr-1 inline h-3 w-3" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleActivate(u.id)}
                        className="border border-emerald-100 bg-emerald-50 text-[10px] font-bold text-emerald-700 transition-all hover:bg-emerald-100"
                      >
                        <Unlock className="mr-1 inline h-3 w-3" />
                        Activate
                      </Button>
                    )}
                    <Button
                      onClick={() => handleRevokeSessions(u.id)}
                      className="border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 transition-all hover:bg-slate-100"
                    >
                      <LogOut className="mr-1 inline h-3 w-3" />
                      Revoke sessions
                    </Button>
                    <Button
                      onClick={() => handleArchive(u.id)}
                      className="col-span-2 border border-rose-100 bg-rose-50 text-[10px] font-bold text-rose-600 transition-all hover:bg-rose-100 hover:text-rose-700"
                    >
                      <Archive className="mr-1 inline h-3 w-3" />
                      Archive account
                    </Button>
                  </div>}
                </article>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">
                No matching user records detected.
              </p>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block" role="region" aria-label="Account directory table" tabIndex={0}>
            <Table className="min-w-[850px]">
              <TableHeader className="border-b border-[#e8f0f5]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">User Identification</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">First Name</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Last Name</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Authorized Role</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right">Administrative Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400 font-medium">
                      Retrieving active user records...
                    </TableCell>
                  </TableRow>
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <TableRow key={u.id} className="border-b border-[#e8f0f5] hover:bg-[#f8fbfd]">
                      <TableCell className="font-semibold text-xs text-slate-800">{u.email}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.firstName || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.lastName || 'N/A'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="rounded-full border border-[#c8d9e7] bg-[#eef6fc] px-2 py-0.5 text-[10px] font-semibold text-[#0a439b]">
                            {u.role?.name === 'live_agent' ? 'Live Agent (retired)' : u.role?.name || 'unknown'}
                          </span>
                          {u.role?.name !== 'live_agent' && (
                            <select
                              defaultValue={u.role?.name || ''}
                              onChange={(event) => {
                                const nextRole = event.target.value;
                                const currentRole = u.role?.name || '';
                                if (nextRole === currentRole) return;
                                if (!window.confirm(`Change ${u.email} to the ${roleOptions.find((option) => option.value === nextRole)?.label || nextRole} role?`)) {
                                  event.currentTarget.value = currentRole;
                                  return;
                                }
                                void handleRoleChange(u.id, nextRole);
                              }}
                              className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md text-[10px] p-1 text-slate-700 transition focus:outline-none"
                            >
                              {roleOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                            : 'bg-rose-50 border border-rose-100 text-rose-700'
                        }`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          {u.role?.name === 'live_agent' ? (
                            <span className="text-xs text-slate-500">
                              Legacy access retired; historical records retained.
                            </span>
                          ) : <>
                          {u.isActive ? (
                            <Button
                              onClick={() => handleDeactivate(u.id)}
                              className="bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                            >
                              <Lock className="h-3 w-3 mr-1 inline" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleActivate(u.id)}
                              className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                            >
                              <Unlock className="h-3 w-3 mr-1 inline" />
                              Activate
                            </Button>
                          )}
                          <Button
                            onClick={() => handleRevokeSessions(u.id)}
                            className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                          >
                            <LogOut className="h-3 w-3 mr-1 inline" />
                            Revoke sessions
                          </Button>
                          <Button
                            onClick={() => handleArchive(u.id)}
                            className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                          >
                            <Archive className="h-3 w-3 mr-1 inline" />
                            Archive
                          </Button>
                          </>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No matching user records detected.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Simple Pagination Controls */}
          <div className="flex items-center justify-between border-t border-[#e8f0f5] pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Showing page {currentPage} · {users.length} of {totalUsers} entries
            </span>
            <div className="flex items-center space-x-2">
              <Button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="bg-white hover:bg-slate-100 border border-slate-200 p-2 rounded-lg text-slate-600 hover:text-slate-800 transition disabled:opacity-40 shadow-sm"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                disabled={currentPage * 5 >= totalUsers}
                onClick={() => setPage(currentPage + 1)}
                className="bg-white hover:bg-slate-100 border border-slate-200 p-2 rounded-lg text-slate-600 hover:text-slate-800 transition disabled:opacity-40 shadow-sm"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      </main>

      {/* ── Create User Account Modal ─────────────────────────── */}
      {showCreateModal && !createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-left">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Create Staff Account</h3>
                <p className="text-[10px] text-slate-400">Faculty, dean, registrar, treasury, or system administrator. Student accounts are created through admission and activation.</p>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institutional Role</label>
                <select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 text-xs text-slate-850 focus:outline-none transition"
                >
                  <option value="faculty">Faculty Member</option>
                  <option value="dean">Academic Dean</option>
                  <option value="registrar">Registrar</option>
                  <option value="treasury">Treasury / Accounting</option>
                  <option value="sys_admin">System Administrator</option>
                </select>
              </div>

              {/* Name Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-850 transition focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Name / Surname</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-850 transition focus:outline-none"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institutional Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@rmc.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-850 transition focus:outline-none"
                />
              </div>

              {/* Student accounts are provisioned through admission + activation,
                  not through staff account creation. */}

              <p className="text-xs text-slate-500">
                A random one-time password will be generated and shown once after account creation. The user must replace it at first login.
              </p>

              <Separator className="bg-slate-100 pt-1" />

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs font-semibold h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 flex items-center justify-center gap-1.5 shadow-md"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ── Credentials Copy Success Modal ─────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mt-2">Account Created Successfully</h3>
              <p className="text-[10px] text-slate-400 font-medium">Please hand over these generated secure credentials to the user.</p>
            </div>

            {/* Credentials details boxes */}
            <div className="space-y-3.5 pt-1">
              
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4 text-left">
                <div className="min-w-0 flex-1">
                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Institutional Email</span>
                  <span className="text-xs font-semibold text-slate-700 truncate block">{createdCredentials.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials.email);
                    toast.success('Email copied!');
                  }}
                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4 text-left">
                <div className="min-w-0 flex-1">
                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Temporary Password</span>
                  <span className="text-xs font-black tracking-wider text-indigo-700 font-mono block truncate">{createdCredentials.tempPass}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials.tempPass);
                    toast.success('Temporary password copied!');
                  }}
                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

            </div>

            {/* Notice */}
            <p className="text-[9px] text-slate-400 leading-relaxed max-w-xs mx-auto italic">
              Note: The user will be automatically forced to change this temporary password during their first login.
            </p>

            <Separator className="bg-slate-100" />

            {/* Done Action */}
            <div className="pt-1">
              <Button
                onClick={() => {
                  setCreatedCredentials(null);
                  setShowCreateModal(false);
                }}
                className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold text-xs py-2.5 rounded-xl shadow-md"
              >
                Close and Finish
              </Button>
            </div>

          </div>
        </div>
      )}

      <PageFooter type="general" />

    </div>
  );
}
