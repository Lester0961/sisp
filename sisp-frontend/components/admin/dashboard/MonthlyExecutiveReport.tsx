'use client';

import { useEffect, useState } from 'react';
import { FileText, Users, CheckCircle, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { analyticsApi, MonthlyReportResponse } from '@/lib/api/analytics';

export function MonthlyExecutiveReport() {
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await analyticsApi.getMonthlyReport();
        setReport(data);
      } catch (err) {
        console.error('Failed to load monthly report', err);
      } finally {
        setLoading(false);
      }
    }
    void loadReport();
  }, []);

  if (loading) {
    return (
      <section className="portal-surface p-5">
        <div className="portal-skeleton h-40 w-full" />
      </section>
    );
  }

  if (!report || !report.summary) {
    return null;
  }

  return (
    <section className="portal-surface p-5 border-l-4 border-l-[#0a439b]">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#dce7ef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#102f49] text-base">Executive Monthly Operational Report</h3>
            <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 border border-blue-200">
              OFFICER: {report.reportingOfficer}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#587387]">
            {report.reportPeriod} · Regis Marie College Systems Health
          </p>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Generated: {new Date(report.generatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        {/* Inquiries & Self-Service */}
        <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3.5">
          <div className="flex items-center gap-2 text-[#0a439b] font-medium text-xs mb-2">
            <HelpCircle className="size-4" />
            <span>Student Inquiries ({report.summary.totalStudentInquiries})</span>
          </div>
          <p className="text-2xl font-bold text-[#102f49]">{report.summary.inquiryResolutionRate}%</p>
          <p className="text-[11px] text-[#587387] mt-0.5">ARIA Self-Service Resolution Rate</p>
          <div className="mt-3 text-xs space-y-1 text-slate-600 border-t border-[#e2edf4] pt-2">
            <div className="flex justify-between"><span>Escalations Resolved:</span><span className="font-semibold text-emerald-700">{report.summary.escalationsResolved}</span></div>
            <div className="flex justify-between"><span>Pending Escalations:</span><span className="font-semibold text-amber-700">{report.summary.pendingEscalations}</span></div>
          </div>
        </div>

        {/* Document Volume */}
        <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3.5">
          <div className="flex items-center gap-2 text-[#0a439b] font-medium text-xs mb-2">
            <FileText className="size-4" />
            <span>Document Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-[#102f49]">{report.summary.totalDocumentRequests}</p>
          <p className="text-[11px] text-[#587387] mt-0.5">Total Document Requests Logged</p>
          <div className="mt-3 text-xs space-y-1 text-slate-600 border-t border-[#e2edf4] pt-2">
            <div className="flex justify-between"><span>Enrolled Active Students:</span><span className="font-semibold">{report.summary.totalEnrolledStudents}</span></div>
            <div className="flex justify-between"><span>Longest TAT Process:</span><span className="font-semibold text-amber-800">TOR (3-4 Weeks)</span></div>
          </div>
        </div>

        {/* Registrar Staff Capacity */}
        <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3.5">
          <div className="flex items-center gap-2 text-[#0a439b] font-medium text-xs mb-2">
            <Users className="size-4" />
            <span>Key Staff Responsibilities</span>
          </div>
          <p className="text-sm font-semibold text-[#102f49]">Enrollment Period Routing</p>
          <p className="text-[11px] text-[#587387] mt-0.5">Cross-departmental assignment</p>
          <div className="mt-2 text-[11px] space-y-1 text-slate-600 border-t border-[#e2edf4] pt-2">
            <div>• <span className="font-semibold text-slate-800">Miss Rose:</span> TOR evaluations & requests</div>
            <div>• <span className="font-semibold text-slate-800">Sir Christian:</span> CHED SO numbers & CAV</div>
            <div>• <span className="font-semibold text-slate-800">Miss Che:</span> Student inquiry reception desk</div>
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      {report.operationalHighlights && report.operationalHighlights.length > 0 && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-2">
            <ShieldCheck className="size-4 text-blue-700" />
            <span>Institutional Compliance & Business Rules Active</span>
          </div>
          <ul className="space-y-1 pl-4 list-disc text-xs text-blue-950/80">
            {report.operationalHighlights.map((highlight, index) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Department Workload Matrix */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#365a72] mb-2">Department Workload & Staff Assignment</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {report.departmentWorkload.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-[#e4ecf2] p-3 bg-white shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-[#102f49]">{item.department}</span>
                <span className="text-[10px] rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-medium text-emerald-800">{item.status}</span>
              </div>
              <p className="text-[11px] text-[#587387] mt-1.5 leading-relaxed">{item.primaryTasks}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
