'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Shield,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  UserPlus,
  Loader2,
  Lock,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const {
    users,
    totalUsers,
    currentPage,
    isLoading,
    fetchUsers,
    updateUserRole,
    deactivateUser,
    createUser,
    deleteUser,
  } = useAdminStore();

  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleName, setRoleName] = useState('student');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [programId, setProgramId] = useState('mock-program-id'); // default BSCS
  const [temporaryPassword, setTemporaryPassword] = useState('');
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      toast.error('Please fill out all required fields');
      return;
    }
    if (roleName === 'student' && !studentNumber) {
      toast.error('Student ID number is required');
      return;
    }
    if (roleName !== 'student' && !temporaryPassword) {
      toast.error('Temporary password is required for staff accounts');
      return;
    }

    setCreating(true);
    try {
      const res = await createUser({
        email,
        firstName,
        lastName,
        roleName,
        studentNumber: roleName === 'student' ? studentNumber : undefined,
        programId: roleName === 'student' ? programId : undefined,
        temporaryPassword: roleName !== 'student' ? temporaryPassword : undefined,
      });

      // Show success modal credentials
      setCreatedCredentials({
        email,
        tempPass: res.temporaryPassword || temporaryPassword,
        role: roleName,
      });

      toast.success('Account created successfully!');
      
      // Clear inputs
      setEmail('');
      setFirstName('');
      setLastName('');
      setStudentNumber('');
      setTemporaryPassword('');
    } catch (err: any) {
      const errMsg = err.response?.data?.message ?? 'Failed to create user account';
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
      } catch (err) {
        toast.error('Failed to deactivate user.');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmFirst = confirm(
      'WARNING: This will PERMANENTLY DELETE this user account, including their profile, grades, enrollments, balance, and chat logs. This action CANNOT be undone.\n\nAre you sure you want to proceed?'
    );
    if (confirmFirst) {
      const confirmSecond = confirm(
        'FINAL WARNING: Double check your choice. Click OK to permanently erase the user.'
      );
      if (confirmSecond) {
        try {
          await deleteUser(userId);
          toast.success('User account permanently deleted.');
        } catch (err) {
          toast.error('Failed to permanently delete user.');
        }
      }
    }
  };

  const handleRoleChange = async (userId: string, roleName: string) => {
    try {
      await updateUserRole(userId, roleName);
      toast.success('User role updated successfully.');
    } catch (err) {
      toast.error('Failed to update role.');
    }
  };

  const roleOptions = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'dean', label: 'Academic Dean' },
    { value: 'admin_staff', label: 'Admin Staff' },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-[#1e3a8a]/20">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[5%] right-[10%] h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[130px] animate-pulse duration-[7s] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] h-[350px] w-[350px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="h-7 w-7 text-indigo-600" />
              Users & Account Management
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              Create, inspect, configure roles, and manage credentials for SISP Students and Staff.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Create User Account
            </Button>
          </div>
        </div>

        {/* User Directory Table Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Active User Enrollment Register</h3>
              <p className="text-[10px] text-slate-400">Manage database roles, authorize system permissions, and revoke active sessions.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-slate-100">
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
                    <TableRow key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-xs text-slate-800">{u.email}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.firstName || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.lastName || 'N/A'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {u.role?.name || 'unknown'}
                          </span>
                          
                          <select
                            defaultValue={u.role?.name || ''}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md text-[10px] p-1 text-slate-700 transition focus:outline-none"
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
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
                          <Button
                            disabled={!u.isActive}
                            onClick={() => handleDeactivate(u.id)}
                            className="bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 disabled:opacity-50 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                          >
                            <Lock className="h-3 w-3 mr-1 inline" />
                            Deactivate
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(u.id)}
                            className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                          >
                            <Trash2 className="h-3 w-3 mr-1 inline" />
                            Delete
                          </Button>
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
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Showing page {currentPage} — {users.length} of {totalUsers} total entries
            </span>
            <div className="flex items-center space-x-2">
              <Button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="bg-white hover:bg-slate-100 border border-slate-200 p-2 rounded-lg text-slate-600 hover:text-slate-800 transition disabled:opacity-40 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                disabled={currentPage * 5 >= totalUsers}
                onClick={() => setPage(currentPage + 1)}
                className="bg-white hover:bg-slate-100 border border-slate-200 p-2 rounded-lg text-slate-600 hover:text-slate-800 transition disabled:opacity-40 shadow-sm"
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
                <h3 className="text-base font-bold text-slate-800">Create User Account</h3>
                <p className="text-[10px] text-slate-400">Register new students, faculty, or system administrators.</p>
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
                  <option value="student">Student</option>
                  <option value="faculty">Faculty Member</option>
                  <option value="dean">Academic Dean</option>
                  <option value="admin_staff">Admin Staff</option>
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

              {/* Student specific fields */}
              {roleName === 'student' && (
                <div className="space-y-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID Number</label>
                      <input
                        type="text"
                        required
                        placeholder="20250001"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-850 transition focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Program</label>
                      <select
                        value={programId}
                        onChange={(e) => setProgramId(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2 text-xs text-slate-850 focus:outline-none transition"
                      >
                        <option value="mock-program-id">BSCS (Computer Science)</option>
                        <option value="mock-program-id-it">BSIT (Information Technology)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 flex flex-col gap-1 text-[10px] text-slate-500 font-medium">
                    <span>Generated Temporary Password Preview:</span>
                    <strong className="text-indigo-600 font-black tracking-wider text-xs">
                      {lastName.trim() && studentNumber.trim().length >= 4
                        ? `${lastName.trim().replace(/\s+/g, '')}${studentNumber.trim().substring(studentNumber.trim().length - 4)}`
                        : 'Surname[Last4]'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Staff specific fields */}
              {roleName !== 'student' && (
                <div className="space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temporary Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Input temporary password"
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-850 transition focus:outline-none font-mono"
                    />
                  </div>
                  <span className="block text-[8px] text-slate-400">Must be at least 8 characters. The user will be forced to change this upon their first login.</span>
                </div>
              )}

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

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Built with high-fidelity cryptographic models.
      </footer>

    </div>
  );
}
