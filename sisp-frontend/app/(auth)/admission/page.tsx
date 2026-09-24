'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { admissionApi, RequirementDefinition } from '@/lib/api/admission';
import { curriculaApi, Program } from '@/lib/api/curricula';
import { Loader2, ArrowLeft, CheckCircle2, UserCheck, UploadCloud, ChevronRight, FileText } from 'lucide-react';

export default function AdmissionPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reqDefs, setReqDefs] = useState<RequirementDefinition[]>([]);
  const [applicationNo, setApplicationNo] = useState<string | null>(null);
  const [requirementUploads, setRequirementUploads] = useState<
    Record<string, { fileName: string; mimeType: string; contentBase64: string }>
  >({});
  const [requirementStatuses, setRequirementStatuses] = useState<Record<string, string>>({});
  const [uploadingDefinitionId, setUploadingDefinitionId] = useState<string | null>(null);
  const [trackedApplication, setTrackedApplication] = useState<any>(null);
  const [tracking, setTracking] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    applicantType: 'freshman',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    dob: '',
    sex: 'Male',
    nationality: 'Filipino',
    email: '',
    mobile: '',
    addressLine: '',
    city: 'Davao City',
    province: 'Davao del Sur',
    postalCode: '8000',
    guardianName: '',
    guardianRelation: 'Parent',
    guardianContact: '',
    emergencyName: '',
    emergencyRelation: 'Parent',
    emergencyContact: '',
    lastSchoolName: '',
    lastSchoolType: 'shs',
    yearGraduated: 2025,
    previousProgram: '',
    strandTrack: 'STEM',
    programId: '',
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const progs = await curriculaApi.getPrograms();
        setPrograms(progs);
        if (progs.length > 0) {
          setFormData((prev) => ({ ...prev, programId: progs[0].id }));
        }

        const defs = await admissionApi.getRequirementDefinitions('freshman');
        setReqDefs(defs);
      } catch (err: any) {
        console.error('Failed to load programs/requirements', err);
        toast.error(err.message || 'Failed to load initial data');
      }
    }
    loadInitial();
  }, []);

  const handleApplicantTypeChange = async (type: string) => {
    setFormData((prev) => ({ ...prev, applicantType: type }));
    try {
      const defs = await admissionApi.getRequirementDefinitions(type);
      setReqDefs(defs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const onPickRequirementFile = (definitionId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('The enrollment or down-payment receipt must be 10 MB or smaller.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only PDF, JPEG, or PNG requirement documents are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const contentBase64 = String(reader.result).split(',')[1] ?? '';
      setRequirementUploads((prev) => ({
        ...prev,
        [definitionId]: { fileName: file.name, mimeType: file.type, contentBase64 },
      }));
    };
    reader.readAsDataURL(file);
  };

  const uploadRequirement = async (definitionId: string) => {
    const upload = requirementUploads[definitionId];
    if (!applicationNo || !upload) {
      toast.error('Choose a file first.');
      return;
    }
    setUploadingDefinitionId(definitionId);
    try {
      const result = await admissionApi.submitRequirement(applicationNo, {
        email: formData.email,
        definitionId,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        contentBase64: upload.contentBase64,
      });
      setRequirementStatuses((prev) => ({ ...prev, [definitionId]: result.status }));
      toast.success('Document uploaded for Registrar review.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not upload this document.');
    } finally {
      setUploadingDefinitionId(null);
    }
  };

  const refreshTrackedStatus = async () => {
    if (!applicationNo) return;
    setTracking(true);
    try {
      const result = await admissionApi.getApplicationStatus(applicationNo, formData.email);
      setTrackedApplication(result);
      const statuses: Record<string, string> = {};
      (result.requirements ?? []).forEach((requirement: any) => {
        if (requirement.definition?.id) statuses[requirement.definition.id] = requirement.status;
      });
      setRequirementStatuses((prev) => ({ ...prev, ...statuses }));
    } catch {
      toast.error('Could not load the application status.');
    } finally {
      setTracking(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.dob ||
      !formData.email.trim() ||
      !formData.mobile.trim() ||
      !formData.addressLine.trim() ||
      !formData.city.trim() ||
      !formData.lastSchoolName.trim() ||
      !formData.guardianName.trim() ||
      !formData.guardianContact.trim() ||
      !formData.emergencyName.trim() ||
      !formData.emergencyContact.trim() ||
      !formData.programId
    ) {
      toast.error('Please complete all required fields before submitting.');
      return;
    }

    setLoading(true);
    try {
      const res = await admissionApi.createApplication(formData);
      setApplicationNo(res.applicationNo);
      setStep(5); // Success step
      toast.success('Admission application submitted successfully!');
      if (!res.emailNotificationSent) {
        toast.info('Your application is saved. Email confirmation is not configured in this local environment.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  const continueToStep = (nextStep: number) => {
    const missingRequiredField =
      (step === 1 &&
        (!formData.dob ||
          !formData.firstName.trim() ||
          !formData.lastName.trim() ||
          !formData.email.trim() ||
          !formData.mobile.trim() ||
          !formData.addressLine.trim() ||
          !formData.city.trim())) ||
      (step === 2 &&
        (!formData.lastSchoolName.trim() ||
          !formData.guardianName.trim() ||
          !formData.guardianContact.trim() ||
          !formData.emergencyName.trim() ||
          !formData.emergencyContact.trim()));

    if (missingRequiredField) {
      toast.error('Complete the required fields on this step before continuing.');
      return;
    }

    if (step === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Enter a valid email address before continuing.');
      return;
    }

    if (step === 3 && !formData.programId) {
      toast.error('Select an academic program before continuing.');
      return;
    }

    setStep(nextStep);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold text-[#0a439b] hover:text-[#083980]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Login
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0a439b] border border-blue-200">
            Flow A: Admission Portal
          </span>
        </div>

        {/* Stepper Header */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex justify-between items-center text-xs font-semibold text-slate-500">
          <span className={step >= 1 ? 'text-[#0a439b] font-bold' : ''}>1. Personal Info</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className={step >= 2 ? 'text-[#0a439b] font-bold' : ''}>2. Education</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className={step >= 3 ? 'text-[#0a439b] font-bold' : ''}>3. Program Choice</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className={step >= 4 ? 'text-[#0a439b] font-bold' : ''}>4. Review</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#102f49]">Personal & Contact Information</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Applicant Category</label>
                  <select
                    value={formData.applicantType}
                    onChange={(e) => handleApplicantTypeChange(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                  >
                    <option value="freshman">Freshman</option>
                    <option value="transferee">Transferee</option>
                    <option value="bridging">Bridging</option>
                    <option value="cross_enrollee">Cross-Enrollee</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Address Line</label>
                  <input
                    type="text"
                    value={formData.addressLine}
                    onChange={(e) => handleInputChange('addressLine', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">City / Municipality</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => continueToStep(2)}
                  className="rounded-xl bg-[#0a439b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#083980]"
                >
                  Next: Educational Background →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#102f49]">Educational Background & Guardian</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Last School Attended</label>
                  <input
                    type="text"
                    value={formData.lastSchoolName}
                    onChange={(e) => handleInputChange('lastSchoolName', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Year Graduated</label>
                  <input
                    type="number"
                    value={formData.yearGraduated}
                    onChange={(e) => handleInputChange('yearGraduated', parseInt(e.target.value) || 2025)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => handleInputChange('guardianName', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Guardian Contact No.</label>
                  <input
                    type="text"
                    value={formData.guardianContact}
                    onChange={(e) => handleInputChange('guardianContact', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyName}
                    onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Emergency Contact No.</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => continueToStep(3)}
                  className="rounded-xl bg-[#0a439b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#083980]"
                >
                  Next: Program Selection →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#102f49]">Preferred Academic Program</h2>
              <p className="text-xs text-slate-500">Select the program you wish to enroll in at Regis Marie College.</p>

              <div className="space-y-2">
                {programs.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                      formData.programId === p.id
                        ? 'border-[#0a439b] bg-blue-50/50 text-[#0a439b] font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="programId"
                        value={p.id}
                        checked={formData.programId === p.id}
                        onChange={() => handleInputChange('programId', p.id)}
                        className="h-4 w-4 text-[#0a439b]"
                      />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-700 mr-2">
                          {p.code}
                        </span>
                        <span className="text-xs">{p.name}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => continueToStep(4)}
                  className="rounded-xl bg-[#0a439b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#083980]"
                >
                  Next: Review Application →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[#102f49]">Review Your Application</h2>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Applicant Type:</span>
                  <span className="font-bold text-[#0a439b] uppercase">{formData.applicantType}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-bold text-slate-800">{formData.firstName} {formData.middleName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Email / Mobile:</span>
                  <span className="font-medium text-slate-800">{formData.email} | {formData.mobile}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Last School:</span>
                  <span className="font-medium text-slate-800">{formData.lastSchoolName} ({formData.yearGraduated})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Program:</span>
                  <span className="font-bold text-[#0a439b]">
                    {programs.find((p) => p.id === formData.programId)?.name}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-xl bg-[#0a439b] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#083980] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Submit Admission Application
                </button>
              </div>
            </div>
          )}

          {step === 5 && applicationNo && (
            <div className="space-y-5 py-6">
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <h2 className="text-xl font-bold text-[#102f49]">Application Submitted!</h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Save your Application Number. Upload only your enrollment or down-payment receipt
                  below for Registrar verification.
                </p>

                <div className="inline-block rounded-xl bg-blue-50 border border-blue-200 px-6 py-3 font-mono font-bold text-lg text-[#0a439b]">
                  {applicationNo}
                </div>
              </div>

              {reqDefs.length > 0 && (
                <div className="text-left space-y-2 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Required upload
                  </h3>
                  {reqDefs.map((definition) => {
                    const status = requirementStatuses[definition.id];
                    const upload = requirementUploads[definition.id];
                    return (
                      <div key={definition.id} className="rounded-lg border border-slate-100 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                            {definition.title}
                              {definition.isRequired ? (
                                <span className="ml-2 text-[10px] font-bold text-rose-600">REQUIRED</span>
                              ) : null}
                            </p>
                            {upload && (
                              <p className="text-[11px] text-slate-500">Selected: {upload.fileName}</p>
                            )}
                          </div>
                          {status && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                status === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : status === 'submitted'
                                    ? 'bg-blue-50 text-[#0a439b]'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            aria-label="Enrollment or down-payment receipt"
                            onChange={(event) =>
                              event.target.files?.[0] &&
                              onPickRequirementFile(definition.id, event.target.files[0])
                            }
                            className="block w-full max-w-xs text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => void uploadRequirement(definition.id)}
                            disabled={
                              !upload || uploadingDefinitionId === definition.id || status === 'verified'
                            }
                            className="rounded-lg bg-[#0a439b] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            {uploadingDefinitionId === definition.id ? 'Uploading…' : 'Upload'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">PDF, JPEG, or PNG · maximum 10 MB</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshTrackedStatus()}
                  disabled={tracking}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {tracking ? 'Checking…' : 'Refresh status'}
                </button>
                {trackedApplication && (
                  <p className="text-[11px] text-slate-600">
                    Status:{' '}
                    <strong className="capitalize">
                      {trackedApplication.status.replace(/_/g, ' ')}
                    </strong>
                    {trackedApplication.studentNumber
                      ? ` · Student number: ${trackedApplication.studentNumber}`
                      : ''}
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-[#0a439b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#083980]"
                >
                  Return to Login
                </Link>
                <Link
                  href="/account-entry"
                  className="rounded-xl border border-[#bed1e0] px-5 py-2.5 text-xs font-semibold text-[#0a439b] hover:bg-[#eef6fc]"
                >
                  Returning or Alumni?
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
