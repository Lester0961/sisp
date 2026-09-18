'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { admissionApi, AdmissionApplication } from '@/lib/api/admission';
import { Loader2, UserCheck, Search, Filter, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminAdmissionPage() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('submitted');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  async function loadApplications() {
    setLoading(true);
    try {
      const data = await admissionApi.listApplications(filterStatus || undefined);
      setApplications(data);
    } catch (err) {
      toast.error('Failed to load admission applications.');
    } finally {
      setLoading(false);
    }
  }

  const handleReview = async (appNo: string, status: string) => {
    setReviewing(true);
    try {
      await admissionApi.reviewApplication(appNo, status, reviewNotes);
      toast.success(`Application ${appNo} marked as ${status}!`);
      setSelectedApp(null);
      setReviewNotes('');
      loadApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Review action failed.');
    } finally {
      setReviewing(false);
    }
  };

  const filteredApps = applications.filter((app) =>
    `${app.firstName} ${app.lastName} ${app.applicationNo} ${app.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#102f49] flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#0a439b]" />
            Admission Applications Review
          </h1>
          <p className="text-xs text-slate-500">
            Process new student applications, verify submitted requirements, and issue student credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="needs_revision">Needs Revision</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search applicant name, email, or application number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-700 outline-none focus:border-[#0a439b]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading applications...
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No admission applications found for status "{filterStatus || 'All'}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 hover:border-blue-300 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-[11px] font-bold text-[#0a439b]">{app.applicationNo}</span>
                  <h3 className="font-bold text-sm text-[#102f49] mt-0.5">
                    {app.firstName} {app.lastName}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    app.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : app.status === 'submitted'
                      ? 'bg-blue-50 text-[#0a439b] border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {app.status}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div><span className="text-slate-400">Type:</span> <span className="font-semibold capitalize">{app.applicantType}</span></div>
                <div><span className="text-slate-400">Program:</span> <span className="font-semibold text-slate-800">{app.program?.code || 'BSCS'}</span></div>
                <div><span className="text-slate-400">Email:</span> {app.email}</div>
                <div><span className="text-slate-400">Mobile:</span> {app.mobile}</div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0a439b] hover:bg-blue-100"
                >
                  Review Application
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-[#102f49] border-b pb-2">
              Review Application {selectedApp.applicationNo}
            </h3>

            <div className="text-xs space-y-2 text-slate-700">
              <p><strong>Applicant:</strong> {selectedApp.firstName} {selectedApp.lastName}</p>
              <p><strong>Email:</strong> {selectedApp.email}</p>
              <p><strong>Program:</strong> {selectedApp.program?.name} ({selectedApp.program?.code})</p>
              <p><strong>Last School:</strong> {selectedApp.lastSchoolName}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reviewer Remarks / Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional review notes or instructions for applicant..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0a439b]"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedApp(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedApp.applicationNo, 'rejected')}
                disabled={reviewing}
                className="rounded-xl bg-red-50 text-red-700 border border-red-200 px-4 py-2 text-xs font-semibold hover:bg-red-100"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(selectedApp.applicationNo, 'approved')}
                disabled={reviewing}
                className="rounded-xl bg-[#0a439b] text-white px-5 py-2 text-xs font-semibold hover:bg-[#083980] flex items-center gap-1.5"
              >
                {reviewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Approve & Create Student Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
