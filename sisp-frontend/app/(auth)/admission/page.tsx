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
      } catch (err) {
        console.error('Failed to load programs/requirements', err);
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

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.mobile || !formData.programId) {
      toast.error('Please complete all required fields before submitting.');
      return;
    }

    setLoading(true);
    try {
      const res = await admissionApi.createApplication(formData);
      setApplicationNo(res.applicationNo);
      setStep(5); // Success step
      toast.success('Admission application submitted successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
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
                  onClick={() => setStep(2)}
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
                  onClick={() => setStep(3)}
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
                  onClick={() => setStep(4)}
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
            <div className="text-center space-y-4 py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h2 className="text-xl font-bold text-[#102f49]">Application Submitted!</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your application has been received. Please save your Application Number to track your status.
              </p>

              <div className="inline-block rounded-xl bg-blue-50 border border-blue-200 px-6 py-3 font-mono font-bold text-lg text-[#0a439b]">
                {applicationNo}
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-[#0a439b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#083980]"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
