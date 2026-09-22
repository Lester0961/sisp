'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { admissionApi, AdmissionApplication, RequirementDefinition } from '@/lib/api/admission';
import { Loader2, UserCheck, Search, Filter, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminAdmissionPage() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('submitted');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [requiredDefs, setRequiredDefs] = useState<RequirementDefinition[]>([]);
  const [requirementBusyId, setRequirementBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  async function loadApplications() {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await admissionApi.listApplications(filterStatus || undefined);
      setApplications(data);
    } catch (err) {
      setLoadError(true);
      toast.error('Failed to load admission applications.');
    } finally {
      setLoading(false);
    }
  }

  const openReview = async (app: AdmissionApplication) => {
    setSelectedApp(app);
    setReviewNotes(app.reviewNotes ?? '');
    try {
      const defs = await admissionApi.getRequirementDefinitions(app.applicantType);
      setRequiredDefs(defs.filter((definition) => definition.isRequired));
    } catch {
      setRequiredDefs([]);
    }
  };

  const handleRequirementReview = async (
    appNo: string,
    submissionId: string,
    status: 'verified' | 'rejected' | 'resubmission_required',
  ) => {
    let requirementNotes: string | undefined;
    if (status !== 'verified') {
      requirementNotes =
        window.prompt(
          status === 'rejected' ? 'Reason for rejecting this document?' : 'What must be resubmitted?',
        ) ?? undefined;
      if (requirementNotes === undefined) return;
    }
    setRequirementBusyId(submissionId);
    try {
      await admissionApi.reviewRequirement(appNo, submissionId, status, requirementNotes);
      toast.success(`Requirement marked ${status.replace(/_/g, ' ')}.`);
      setSelectedApp((current) =>
        current
          ? {
              ...current,
              requirements: (current.requirements ?? []).map((requirement) =>
                requirement.id === submissionId
                  ? { ...requirement, status, reviewNotes: requirementNotes ?? requirement.reviewNotes }
                  : requirement,
              ),
            }
          : current,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Requirement review failed.');
    } finally {
      setRequirementBusyId(null);
    }
  };

  const missingRequirements = selectedApp
    ? requiredDefs.filter((definition) => {
        const submission = (selectedApp.requirements ?? []).find(
          (requirement) => requirement.definition?.id === definition.id,
        );
        return !submission || submission.status !== 'verified';
      })
    : [];

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
          aria-label="Search applicant name, email, or application number"
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
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p>Admission applications could not be loaded.</p>
          <button type="button" onClick={() => void loadApplications()} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold hover:bg-red-100">Retry</button>
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
                <div><span className="text-slate-400">Program:</span> <span className="font-semibold text-slate-800">{app.program?.code || 'Not recorded'}</span></div>
                <div><span className="text-slate-400">Email:</span> {app.email}</div>
                <div><span className="text-slate-400">Mobile:</span> {app.mobile}</div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => void openReview(app)}
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

            <div className="space-y-2 rounded-xl border border-slate-100 p-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Requirements
              </h4>
              {requiredDefs.length === 0 ? (
                <p className="text-[11px] text-slate-500">No required documents configured.</p>
              ) : (
                <ul className="space-y-2">
                  {requiredDefs.map((definition) => {
                    const submission = (selectedApp.requirements ?? []).find(
                      (requirement) => requirement.definition?.id === definition.id,
                    );
                    const status = submission?.status ?? 'missing';
                    return (
                      <li key={definition.id} className="rounded-lg border border-slate-100 p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {definition.title}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              status === 'verified'
                                ? 'bg-emerald-50 text-emerald-700'
                                : status === 'submitted'
                                  ? 'bg-blue-50 text-[#0a439b]'
                                  : status === 'missing'
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {submission?.fileName && (
                          <p className="text-[10px] text-slate-500">
                            {submission.fileName}
                            {submission.fileSize ? ` · ${Math.round(submission.fileSize / 1024)} KB` : ''}
                          </p>
                        )}
                        {submission?.reviewNotes && (
                          <p className="text-[10px] text-slate-500">Notes: {submission.reviewNotes}</p>
                        )}
                        {submission && status !== 'verified' && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                void handleRequirementReview(selectedApp.applicationNo, submission.id, 'verified')
                              }
                              disabled={requirementBusyId === submission.id}
                              className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleRequirementReview(
                                  selectedApp.applicationNo,
                                  submission.id,
                                  'resubmission_required',
                                )
                              }
                              disabled={requirementBusyId === submission.id}
                              className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              Request resubmission
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleRequirementReview(selectedApp.applicationNo, submission.id, 'rejected')
                              }
                              disabled={requirementBusyId === submission.id}
                              className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {missingRequirements.length > 0 && (
                <p className="text-[11px] text-amber-700">
                  Approval is blocked until verified: {missingRequirements.map((definition) => definition.code).join(', ')}
                </p>
              )}
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
                disabled={reviewing || missingRequirements.length > 0}
                title={
                  missingRequirements.length > 0
                    ? 'Verify all required documents before approving'
                    : undefined
                }
                className="rounded-xl bg-[#0a439b] text-white px-5 py-2 text-xs font-semibold hover:bg-[#083980] disabled:opacity-50 flex items-center gap-1.5"
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
