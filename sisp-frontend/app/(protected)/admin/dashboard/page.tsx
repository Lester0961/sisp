'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap,
  LogOut,
  Users,
  FileText,
  Shield,
  Sparkles,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const {
    users,
    totalUsers,
    currentPage,
    dashboardStats,
    enrollmentStats,
    chatbotAnalytics,
    isLoading,
    fetchUsers,
    updateUserRole,
    deactivateUser,
    fetchDashboardStats,
    fetchEnrollmentStats,
    fetchChatbotAnalytics,
    downloadEnrollmentReport,
  } = useAdminStore();

  const [page, setPage] = useState(1);
  const [roleChangeTarget, setRoleChangeTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers(page, 5);
    fetchDashboardStats();
    fetchEnrollmentStats();
    fetchChatbotAnalytics();
  }, [page, fetchUsers, fetchDashboardStats, fetchEnrollmentStats, fetchChatbotAnalytics]);

  const handleDeactivate = async (userId: string) => {
    if (confirm('Are you sure you want to deactivate this user? Their active session will be revoked immediately.')) {
      try {
        await deactivateUser(userId);
        fetchDashboardStats();
      } catch (err) {
        alert('Failed to deactivate user.');
      }
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await updateUserRole(userId, roleId);
    } catch (err) {
      alert('Failed to update role.');
    }
  };

  // Roles configuration mapping inside Postgres DB
  const roleOptions = [
    { id: 'admin_staff', name: 'Admin Staff' },
    { id: 'faculty', name: 'Faculty' },
    { id: 'dean', name: 'Academic Dean' },
    { id: 'student', name: 'Student' },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#07060E] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#110E28] via-[#06050A] to-[#020204] text-slate-100 font-sans overflow-x-hidden selection:bg-indigo-500/35">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[5%] right-[10%] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[130px] animate-pulse duration-[7s] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] h-[350px] w-[350px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Floating Header Panel */}
      <header className="sticky top-0 w-full z-30 bg-[#07060E]/50 backdrop-blur-xl border-b border-white/[0.05] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shadow-inner">
              <GraduationCap className="h-5 w-5 text-indigo-400" />
            </div>
            <span className="font-bold tracking-wide text-sm bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              REGIS MARIE SISP — ADMIN PORTAL
            </span>
          </div>
          <div className="flex items-center space-x-5">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-slate-300 font-semibold">{user?.email}</span>
              <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold">System Administrator</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-xs hover:bg-white/5 border border-white/[0.06] hover:border-white/10 rounded-lg text-rose-300 hover:text-rose-200 transition-all duration-300 flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Administrative Control Hub
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium">
              Manage enrollments, inspect active user lists, and review chatbot decision aggregates.
            </p>
          </div>
          <Button
            onClick={downloadEnrollmentReport}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export Enrollment Excel
          </Button>
        </div>

        {/* Counter Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="p-5 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">System Users</span>
              <p className="text-2xl font-black text-slate-100">{dashboardStats?.totalUsers ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/10">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Active Students</span>
              <p className="text-2xl font-black text-slate-100">{dashboardStats?.totalStudents ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/10">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Faculty Members</span>
              <p className="text-2xl font-black text-slate-100">{dashboardStats?.totalFaculty ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/10">
              <Shield className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">File Requests</span>
              <p className="text-2xl font-black text-slate-100">{dashboardStats?.totalRequests ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/10">
              <FileText className="h-5 w-5" />
            </div>
          </div>

        </div>

        {/* Visual Recharts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Enrollment Distributions Barchart */}
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Program Enrollment Allocations</h3>
                <p className="text-[10px] text-slate-500">Breakdown of student registrations per curriculum profile</p>
              </div>
              <div className="h-7 px-2 bg-indigo-500/10 border border-indigo-500/25 rounded-md flex items-center gap-1 text-[9px] font-bold text-indigo-300">
                <TrendingUp className="h-3.5 w-3.5" />
                Live Feed
              </div>
            </div>
            <div className="h-[250px] w-full text-slate-400">
              {enrollmentStats?.data && enrollmentStats.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentStats.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="programName" stroke="#64748B" fontSize={8} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0A12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                      labelStyle={{ color: '#fff', fontSize: '9px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#818CF8', fontSize: '9px' }}
                    />
                    <Bar dataKey="count" fill="url(#indigoGrad)" radius={[4, 4, 0, 0]}>
                      {enrollmentStats.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  No active enrollment metrics logged
                </div>
              )}
            </div>
          </div>

          {/* Chatbot Accuracy Piechart */}
          <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                ARIA AI Classification Shares
              </h3>
              <p className="text-[10px] text-slate-500">Distribution of advisor intents classified in real-time</p>
            </div>
            <div className="h-[250px] w-full relative flex items-center justify-center">
              {chatbotAnalytics?.intentDistribution && chatbotAnalytics.intentDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chatbotAnalytics.intentDistribution}
                      dataKey="count"
                      nameKey="intent"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {chatbotAnalytics.intentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0A12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                      itemStyle={{ color: '#fff', fontSize: '9px' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={6}
                      formatter={(value) => <span className="text-[9px] text-slate-400 font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  No chatbot analytics logs detected
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Paginated User Datatable */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Active User Enrollment Register</h3>
              <p className="text-[10px] text-slate-500">View user registration entries, re-assign database access rules, and block credentials.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-white/[0.04]">
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
                    <TableRow key={u.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                      <TableCell className="font-semibold text-xs text-slate-200">{u.email}</TableCell>
                      <TableCell className="text-xs text-slate-300">{u.firstName || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-300">{u.lastName || 'N/A'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                            {roleOptions.find((r) => r.id === u.roleId)?.name || u.role?.name || 'Student'}
                          </span>
                          
                          <select
                            defaultValue={u.roleId}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-slate-900 border border-white/10 hover:border-white/20 rounded-md text-[10px] p-1 text-slate-200 transition"
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          disabled={!u.isActive}
                          onClick={() => handleDeactivate(u.id)}
                          className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all"
                        >
                          <Trash2 className="h-3 w-3 mr-1 inline" />
                          Deactivate
                        </Button>
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
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Showing page {currentPage} — {users.length} of {totalUsers} total entries
            </span>
            <div className="flex items-center space-x-2">
              <Button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="bg-white/5 hover:bg-white/10 border border-white/[0.05] p-2 rounded-lg text-slate-300 hover:text-white transition disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                disabled={currentPage * 5 >= totalUsers}
                onClick={() => setPage(currentPage + 1)}
                className="bg-white/5 hover:bg-white/10 border border-white/[0.05] p-2 rounded-lg text-slate-300 hover:text-white transition disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-white/[0.03] text-slate-600 text-[10px] pointer-events-none select-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Built with high-fidelity cryptographic models.
      </footer>

    </div>
  );
}