'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/stores/adminStore';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { AmbientBackground } from '@/components/shared/AmbientBackground';
import { PageFooter } from '@/components/shared/PageFooter';
import {
  GraduationCap,
  Users,
  FileText,
  Shield,
  Download,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { EnrollmentWidget } from '@/components/admin/dashboard/EnrollmentWidget';
import { ChatbotAnalyticsWidget } from '@/components/admin/dashboard/ChatbotAnalyticsWidget';
import { GpaDistributionWidget } from '@/components/admin/dashboard/GpaDistributionWidget';

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
    
    // Only fetch enrollment stats if admin_staff, dean, or sys_admin
    if (user.role === 'admin_staff' || user.role === 'dean' || user.role === 'sys_admin') {
      fetchEnrollmentStats();
    }
    
    // Only fetch chatbot stats if admin_staff, dean, or sys_admin
    if (user.role === 'admin_staff' || user.role === 'dean' || user.role === 'sys_admin') {
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
      
      <AmbientBackground topColor="bg-indigo-500/5" bottomColor="bg-violet-600/5" />

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
          
          {/* Row 1 for Admin, Dean, and SysAdmin: Enrollment Stats & Chatbot Shares */}
          {(user?.role === 'admin_staff' || user?.role === 'dean' || user?.role === 'sys_admin') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <EnrollmentWidget data={enrollmentStats?.data || []} />
              </div>
              <div className="lg:col-span-5">
                <ChatbotAnalyticsWidget intentDistribution={chatbotAnalytics?.intentDistribution || []} />
              </div>
            </div>
          )}

          {/* Row 2: General GPA Distribution & Course Pass/Fail Rates (Allowed for all: Admin, Dean, Faculty, SysAdmin) */}
          {(user?.role === 'admin_staff' || user?.role === 'dean' || user?.role === 'faculty' || user?.role === 'sys_admin') && (
            <GpaDistributionWidget gpaChartData={gpaChartData} passFailData={passFailData} />
          )}

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

      <PageFooter type="cryptographic" />

    </div>
  );
}