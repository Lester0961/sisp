'use client';

import React, { useState, useEffect } from 'react';
import { chatApi, EscalationRecord } from '@/lib/api/chat';
import { Navbar } from '@/components/shared/Navbar';
import { PageFooter } from '@/components/shared/PageFooter';
import { 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  User, 
  Mail, 
  RefreshCw,
  Edit3,
  Check,
  FileText,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Quick-fill templates to assist academic advisors with common inquiries
const POLICY_TEMPLATES = [
  {
    name: 'Official TOR Request Procedure',
    text: 'Clearance approved. To request your Official Transcript of Records (TOR), please submit the Document Request Form through your student portal or in person at the Registrar. The fee is PHP 200.00 per page, and processing time is 7 to 10 working days. Ensure your clearances from the Accounting Office, Library, and Dean\'s Office are fully signed.'
  },
  {
    name: 'Late Enrollment Clearance',
    text: 'Late enrollment is permitted up to the second week of regular classes. Please settle the PHP 500.00 Late Enrollment Fee at the Accounting Office, and submit your updated Matriculation Form to the Registrar to reactivate your course units.'
  },
  {
    name: 'Grade Appeal Procedure (5-Day Window)',
    text: 'Under Regis Marie College policies, formal grade re-evaluation appeals must be submitted in writing to the Dean\'s Office within five (5) working days from final grade posting in the SISP. The course Dean and instructor will conduct a joint calculation review.'
  },
  {
    name: 'Incomplete (INC) Grade Resolution',
    text: 'A grade of INC must be resolved by submitting your missing major requirements or taking the special completion exam within one (1) academic year. Failure to do so will automatically convert your INC grade into a failing grade of 5.00.'
  }
];

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  
  // Resolution Dialog state
  const [selectedRecord, setSelectedRecord] = useState<EscalationRecord | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getEscalations();
      setEscalations(data);
    } catch (error) {
      console.error('Failed to load escalations:', error);
      toast.error('Could not load escalation records. Please check API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleOpenResolve = (record: EscalationRecord) => {
    setSelectedRecord(record);
    setResolutionText(record.resolution || '');
  };

  const handleSelectTemplate = (templateText: string) => {
    setResolutionText(templateText);
    toast.success('Policy template applied successfully!');
  };

  const handleSubmitResolution = async () => {
    if (!selectedRecord) return;
    if (!resolutionText.trim()) {
      toast.error('Please input a resolution before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await chatApi.resolveEscalation(selectedRecord.id, resolutionText.trim());
      toast.success('Escalation resolved and updated successfully!');
      setSelectedRecord(null);
      fetchRecords(); // Reload grid
    } catch (error) {
      console.error('Failed to submit resolution:', error);
      toast.error('Failed to submit resolution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats computation
  const pendingCount = escalations.filter(e => e.status === 'pending').length;
  const resolvedCount = escalations.filter(e => e.status === 'resolved').length;

  // Filtered dataset
  const filteredRecords = escalations.filter(e => {
    if (filterStatus === 'all') return true;
    return e.status === filterStatus;
  });

  return (
    <div className="portal-page">
      <Navbar />

      <main className="portal-main max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="portal-title flex items-center gap-2">
            <ShieldAlert className="size-6 text-[#0a439b]" strokeWidth={1.8} />
            Advising escalations
          </h1>
          <p className="portal-description mt-2">
            Review and provide official registrar resolutions for queries flagged for human review by ARIA.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchRecords} 
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Stats Cards Row */}
      <div className="portal-surface grid grid-cols-3 divide-x divide-[#dce7ef] overflow-hidden p-0">
        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#587387]">Total</span>
              <h2 className="mt-2 text-2xl font-semibold text-[#102f49]">{escalations.length}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 bg-amber-50/40 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">Pending</span>
              <h2 className="mt-2 text-2xl font-semibold text-amber-700">{pendingCount}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 bg-emerald-50/40 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Resolved</span>
              <h2 className="mt-2 text-2xl font-semibold text-emerald-700">{resolvedCount}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-[#dce7ef] pb-4">
        <Button 
          variant={filterStatus === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilterStatus('all')}
          className="h-8 px-4 text-xs font-medium rounded-full"
        >
          All Requests ({escalations.length})
        </Button>
        <Button 
          variant={filterStatus === 'pending' ? 'default' : 'ghost'}
          onClick={() => setFilterStatus('pending')}
          className="h-8 px-4 text-xs font-medium rounded-full text-amber-700 hover:text-amber-800"
        >
          Pending Handoffs ({pendingCount})
        </Button>
        <Button 
          variant={filterStatus === 'resolved' ? 'default' : 'ghost'}
          onClick={() => setFilterStatus('resolved')}
          className="h-8 px-4 text-xs font-medium rounded-full text-emerald-700 hover:text-emerald-800"
        >
          Resolved ({resolvedCount})
        </Button>
      </div>

      {/* Escalations List */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Clock className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold">Fetching escalations queue...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="portal-surface portal-empty">
          <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100 mx-auto">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base">All caught up!</h4>
            <p className="text-slate-500 text-xs mt-1">No pending escalations matched your filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredRecords.map((record) => {
            const studentName = `${record.chat.user.firstName} ${record.chat.user.lastName}`.trim();
            const dateFormatted = new Date(record.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const isPending = record.status === 'pending';

            return (
              <Card key={record.id} className="portal-surface overflow-hidden">
                <CardHeader className="bg-slate-50/50 p-4 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center space-x-3 select-none">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-inner">
                      {record.chat.user.firstName?.[0] || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{studentName || 'Student'}</h4>
                      <div className="flex items-center text-[10px] text-slate-400 space-x-2.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5" />
                          {record.chat.user.email}
                        </span>
                        <span>•</span>
                        <span>Student support request</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={`text-[10px] h-5 px-2 font-bold uppercase tracking-wide border-0 ${
                      isPending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {record.status}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-medium">{dateFormatted}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 space-y-3">
                  {/* Chat query snippet */}
                  <div className="bg-slate-50 border border-slate-100/50 p-3 rounded-xl space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 select-none">
                      <User className="h-3 w-3" />
                      Student Message:
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed font-semibold">
                      &ldquo;{record.chat.message}&rdquo;
                    </p>
                  </div>

                  {/* ARIA default response snippet */}
                  <div className="bg-indigo-50/20 border border-indigo-50/50 p-3 rounded-xl space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1 select-none">
                      <Sparkles className="h-3 w-3" />
                      ARIA response
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed italic truncate">
                      {record.chat.response.replace(/###|#|\*\*|>/g, '')}
                    </p>
                  </div>

                  {/* If resolved: display resolution */}
                  {!isPending && record.resolution && (
                    <div className="border-t border-slate-100 pt-3 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 select-none">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Staff response
                      </div>
                      <div className="bg-emerald-50/20 border border-emerald-50/40 p-3 rounded-xl text-xs leading-relaxed text-slate-700">
                        {record.resolution}
                      </div>
                      {record.assignee && (
                        <div className="text-[10px] text-slate-400 font-medium text-right">
                          Resolved by: <span className="text-slate-600 font-bold">{record.assignee.firstName} {record.assignee.lastName}</span> ({record.assignee.email})
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                {isPending && (
                  <CardFooter className="p-4 border-t bg-slate-50/30 flex items-center justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenResolve(record)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 h-8 px-3.5 rounded-lg shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Draft response
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolution Interactive Modal Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl bg-white border border-slate-100 rounded-2xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="select-none">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Resolve Inquiry Escalation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Provide an official response. Your resolution will be posted directly back to the student&apos;s chat window as an official advisor notification.
            </DialogDescription>
          </DialogHeader>
          
          <Separator className="my-2" />

          {selectedRecord && (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {/* Student info card */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Student Name: <strong className="text-slate-800 font-bold">{selectedRecord.chat.user.firstName} {selectedRecord.chat.user.lastName}</strong></span>
                <span className="text-slate-500 font-medium">Email: <strong className="text-slate-800 font-bold">{selectedRecord.chat.user.email}</strong></span>
              </div>

              {/* Student Query */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">Student Question:</label>
                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50 text-xs font-semibold text-slate-800 leading-relaxed">
                  &ldquo;{selectedRecord.chat.message}&rdquo;
                </div>
              </div>

              {/* Quick templates panel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1 select-none">
                  <FileText className="h-3 w-3" />
                  Quick-Fill Policy Templates:
                </label>
                <div className="flex flex-wrap gap-2">
                  {POLICY_TEMPLATES.map((tmpl, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectTemplate(tmpl.text)}
                      className="text-[10px] h-7 px-2.5 rounded-full border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/20"
                    >
                      {tmpl.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Resolution Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">Official Advisor Resolution Response:</label>
                <textarea
                  rows={4}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Draft your official advisory response here..."
                  className="w-full p-3 text-xs leading-relaxed text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>
          )}

          <Separator className="my-2" />

          <DialogFooter className="flex justify-end gap-2 p-1 bg-slate-50/50 rounded-b-xl select-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRecord(null)}
              className="text-xs h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitResolution}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 shadow flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Resolve Escalation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>

      <PageFooter type="advising" />
    </div>
  );
}
