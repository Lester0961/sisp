'use client';

import { useEffect, useState } from 'react';
import { FileText, Users, HelpCircle } from 'lucide-react';
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
            <h3 className="font-semibold text-[#102f49] text-base">Monthly Activity Report</h3>
          </div>
          <p className="mt-1 text-xs text-[#587387]">
            {new Date(report.reportPeriod.start).toLocaleDateString()} – {new Date(report.reportPeriod.endExclusive).toLocaleDateString()} (end exclusive)
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
          <p className="text-2xl font-bold text-[#102f49]">
            {report.summary.escalationResolutionRate === null ? '—' : `${report.summary.escalationResolutionRate}%`}
          </p>
          <p className="text-[11px] text-[#587387] mt-0.5">Escalations resolved in this period</p>
          <div className="mt-3 text-xs space-y-1 text-slate-600 border-t border-[#e2edf4] pt-2">
            <div className="flex justify-between"><span>Escalations Created:</span><span className="font-semibold">{report.summary.escalationsCreated}</span></div>
            <div className="flex justify-between"><span>Escalations Resolved:</span><span className="font-semibold text-emerald-700">{report.summary.escalationsResolved}</span></div>
            <div className="flex justify-between"><span>Pending Escalations:</span><span className="font-semibold text-amber-700">{report.summary.pendingEscalations}</span></div>
          </div>
        </div>

        {/* Document Volume */}
        <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3.5">
          <div className="flex items-center gap-2 text-[#0a439b] font-medium text-xs mb-2">
            <FileText className="size-4" />
            <span>Document Requests</span>
          </div>
          <p className="text-2xl font-bold text-[#102f49]">{report.summary.totalDocumentRequests}</p>
          <p className="text-[11px] text-[#587387] mt-0.5">Requests created in this period</p>
          <div className="mt-3 text-xs space-y-1 text-slate-600 border-t border-[#e2edf4] pt-2">
            <div className="flex justify-between"><span>Student Profiles:</span><span className="font-semibold">{report.summary.totalStudentProfiles}</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-[#dce7ef] bg-[#f8fbfe] p-3.5">
          <div className="flex items-center gap-2 text-[#0a439b] font-medium text-xs mb-2">
            <Users className="size-4" />
            <span>Top Inquiry Topics</span>
          </div>
          {report.topStudentConcerns?.length ? (
            <ul className="space-y-1 text-xs text-slate-600">
              {report.topStudentConcerns.map((item) => (
                <li key={item.topic} className="flex justify-between gap-2">
                  <span>{item.topic}</span><span className="font-semibold">{item.inquiryCount}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-slate-500">No inquiry topics recorded in this period.</p>}
        </div>
      </div>

    </section>
  );
}
