'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import {
  GraduationCap,
  Users,
  FileText,
  Shield,
  Sparkles,
  Download,
  TrendingUp,
  ArrowRight,
  UserCheck,
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
  const { user } = useAuth();
  const {
    dashboardStats,
    enrollmentStats,
    chatbotAnalytics,
    gpaDistribution,
    fetchDashboardStats,
    fetchEnrollmentStats,
    fetchChatbotAnalytics,
    fetchGpaDistribution,
    downloadEnrollmentReport,
  } = useAdminStore();

  useEffect(() => {
    if (!user) return;

    fetchDashboardStats();
    fetchGpaDistribution();
    
    // Only fetch enrollment stats if admin_staff or dean
    if (user.role === 'admin_staff' || user.role === 'dean') {
      fetchEnrollmentStats();
    }
    
    // Only fetch chatbot stats if admin_staff
    if (user.role === 'admin_staff') {
      fetchChatbotAnalytics();
    }
  }, [user, fetchDashboardStats, fetchEnrollmentStats, fetchChatbotAnalytics, fetchGpaDistribution]);

  // Format Recharts GPA distribution array
  const gpaChartData = gpaDistribution?.distribution
    ? Object.entries(gpaDistribution.distribution).map(([bracket, count]) => ({
        bracket,
        count,
      }))
    : [];

  const passFailData = gpaDistribution?.passFailRates || [];

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-[#1e3a8a]/20">
      
      {/* Background Depth Ambient Blobs */}
      <div className="absolute top-[5%] right-[10%] h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[130px] animate-pulse duration-[7s] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] h-[350px] w-[350px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <Navbar />

      {/* Main Grid View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Welcome Section based on Roles (HCI clear orientation) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              {user?.role === 'admin_staff' && 'Administrative Control Hub'}
              {user?.role === 'dean' && 'Academic Dean Control Panel'}
              {user?.role === 'faculty' && 'Faculty Advisor Hub'}
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              {user?.role === 'admin_staff' && 'Manage enrollments, inspect active user lists, and review chatbot decision aggregates.'}
              {user?.role === 'dean' && 'Inspect student enrollment distributions, approve academic requests, and review GPA aggregates.'}
              {user?.role === 'faculty' && 'Review aggregate student grades, inspect classroom metric summaries, and encode evaluations.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {user?.role === 'admin_staff' && (
              <>
                <Link href="/admin/users" className="w-full sm:w-auto">
                  <Button
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="h-4 w-4" />
                    Manage User Directory
                  </Button>
                </Link>
                <Button
                  onClick={downloadEnrollmentReport}
                  className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Export Enrollment Excel
                </Button>
              </>
            )}
            {user?.role === 'dean' && (
              <Link href="/dean/exceptions" className="w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  Manage Academic Exceptions
                </Button>
              </Link>
            )}
            {user?.role === 'faculty' && (
              <Link href="/faculty/grades" className="w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  <GraduationCap className="h-4 w-4" />
                  Encode Classroom Grades
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Counter Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">System Users</span>
              <p className="text-2xl font-black text-slate-800">{dashboardStats?.totalUsers ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-650 border border-indigo-100">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Active Students</span>
              <p className="text-2xl font-black text-slate-800">{dashboardStats?.totalStudents ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Faculty Members</span>
              <p className="text-2xl font-black text-slate-800">{dashboardStats?.totalFaculty ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-650 border border-violet-100">
              <Shield className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">File Requests</span>
              <p className="text-2xl font-black text-slate-800">{dashboardStats?.totalRequests ?? '...'}</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-650 border border-indigo-100">
              <FileText className="h-5 w-5" />
            </div>
          </div>

        </div>

        {/* Dynamic Charts Section based on Role Authorizations (HCI relevance-filtering) */}
        <div className="space-y-6">
          
          {/* Row 1 for Admin and Dean: Enrollment Stats & Chatbot Shares */}
          {(user?.role === 'admin_staff' || user?.role === 'dean') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Enrollment allocations (both Dean and Admin can see this) */}
              <div className={user?.role === 'dean' ? 'lg:col-span-12 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4' : 'lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4'}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Program Enrollment Allocations</h3>
                    <p className="text-[10px] text-slate-400">Breakdown of student registrations per curriculum profile</p>
                  </div>
                  <div className="h-7 px-2 bg-indigo-50 border border-indigo-100 rounded-md flex items-center gap-1 text-[9px] font-bold text-indigo-750">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Live Feed
                  </div>
                </div>
                <div className="h-[250px] w-full min-h-[250px] text-slate-500">
                  {enrollmentStats?.data && enrollmentStats.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                      <BarChart data={enrollmentStats.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="programName" stroke="#64748B" fontSize={8} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          labelStyle={{ color: '#0f172a', fontSize: '9px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#4f46e5', fontSize: '9px' }}
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
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      No active enrollment metrics logged
                    </div>
                  )}
                </div>
              </div>

              {/* Chatbot Accuracy (Admin only) */}
              {user?.role === 'admin_staff' && (
                <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-indigo-650" />
                      ARIA AI Classification Shares
                    </h3>
                    <p className="text-[10px] text-slate-400">Distribution of advisor intents classified in real-time</p>
                  </div>
                  <div className="h-[250px] w-full min-h-[250px] relative flex items-center justify-center">
                    {chatbotAnalytics?.intentDistribution && chatbotAnalytics.intentDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
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
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            itemStyle={{ color: '#0f172a', fontSize: '9px' }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={6}
                            formatter={(value) => <span className="text-[9px] text-slate-500 font-medium">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        No chatbot analytics logs detected
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Row 2: General GPA Distribution & Course Pass/Fail Rates (Allowed for all: Admin, Dean, Faculty) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* GPA Distribution Matrix */}
            <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">SISP GPA Bracket Distributions</h3>
                <p className="text-[10px] text-slate-400">Student count allocations per academic grading bracket</p>
              </div>
              <div className="h-[250px] w-full min-h-[250px] text-slate-500">
                {gpaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={gpaChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="bracket" stroke="#64748B" fontSize={8} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        labelStyle={{ color: '#0f172a', fontSize: '9px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#8b5cf6', fontSize: '9px' }}
                      />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                        {gpaChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    No grade matrix profiles logged
                  </div>
                )}
              </div>
            </div>

            {/* Course Grade Pass/Fail Rates */}
            <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Class Performance Outcome Ratios</h3>
                <p className="text-[10px] text-slate-400">Ratio of student passing outcomes versus failed scores per course</p>
              </div>
              <div className="h-[250px] w-full min-h-[250px] text-slate-500">
                {passFailData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={passFailData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="code" stroke="#64748B" fontSize={8} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        labelStyle={{ color: '#0f172a', fontSize: '9px', fontWeight: 'bold' }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={24}
                        iconType="circle"
                        iconSize={6}
                        formatter={(value) => <span className="text-[9px] text-slate-500 font-medium capitalize">{value}</span>}
                      />
                      <Bar dataKey="pass" fill="#10B981" radius={[4, 4, 0, 0]} name="Passed" />
                      <Bar dataKey="fail" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    No course outcome scores recorded
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Directory Access Redirection Card (ONLY for Admin Staff - HCI security principles) */}
        {user?.role === 'admin_staff' && (
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border border-indigo-950">
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Comprehensive Directory Access Control</h3>
              <p className="text-indigo-200 text-xs md:text-sm leading-relaxed max-w-xl">
                Need to register new student intakes, provision temporary faculty credentials, configure roles, or deactivate user profiles? Visit the dedicated Users & Accounts directory.
              </p>
            </div>
            <Link href="/admin/users" className="w-full md:w-auto shrink-0">
              <Button className="w-full md:w-auto bg-white hover:bg-slate-100 text-indigo-950 font-bold text-xs py-2.5 px-5 rounded-xl shadow-md flex items-center justify-center gap-1.5 group">
                Manage User Directory
                <ArrowRight className="h-4 w-4 text-indigo-900 group-hover:translate-x-0.5 transition" />
              </Button>
            </Link>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-100 text-slate-400 text-[10px] pointer-events-none select-none">
        &copy; {new Date().getFullYear()} Regis Marie College SISP. Built with high-fidelity cryptographic models.
      </footer>

    </div>
  );
}