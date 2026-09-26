'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageFooter } from '@/components/shared/PageFooter';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';
import { knowledgeBaseErrorMessage } from '@/lib/knowledgeBaseErrors';
import {
  BookOpen,
  Archive,
  RefreshCw,
  Edit,
  Plus,
  FileText,
  Save,
  X,
  Database,
  MessageSquareText,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface KbDocument {
  filename: string;
  title?: string;
  category: string;
  content: string;
  sizeBytes: number;
  updatedAt?: string;
  version?: string | null;
  effectiveDate?: string | null;
  active?: boolean;
  retrievalEligible?: boolean;
  indexStatus?: 'pending' | 'indexed' | 'sparse' | 'failed' | 'unknown';
  indexError?: string | null;
  indexedAt?: string | null;
}

export default function KbManagementPage() {
  useAuth();
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [indexStatusMessage, setIndexStatusMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit / Add state
  const [editingDoc, setEditingDoc] = useState<KbDocument | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [newCategory, setNewCategory] = useState('grading_policy');
  const [newContent, setNewContent] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getKbDocuments();
      setDocuments(res.documents || []);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load KB documents:', err);
      const message = knowledgeBaseErrorMessage(err, 'load');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleEditClick = (doc: KbDocument) => {
    setEditingDoc({ ...doc });
    setIsAdding(false);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    try {
      const result = await adminApi.updateKbDocument(editingDoc.filename, editingDoc.content);
      if (result?.indexStatus === 'sparse' && result?.retrievalEligible) {
        toast.success(`Saved ${editingDoc.filename}; it is ready for retrieval.`);
        setIndexStatusMessage(`Saved ${editingDoc.filename}; approved sparse retrieval now reads the updated database content.`);
      } else if (result?.indexStatus === 'sparse') {
        toast.success(`Saved ${editingDoc.filename}; ARIA source approval is required before retrieval.`);
        setIndexStatusMessage(`Saved ${editingDoc.filename}; add it to ARIA's approved source list before retrieval can use it.`);
      } else {
        toast.success(`Saved ${editingDoc.filename}. Re-indexing is required before retrieval reflects the change.`);
        setIndexStatusMessage(`Saved ${editingDoc.filename}; retrieval synchronization is pending and has not been confirmed.`);
      }
      setEditingDoc(null);
      loadDocuments();
    } catch (err) {
      console.error('Failed to save document:', err);
      toast.error(knowledgeBaseErrorMessage(err, 'save'));
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setEditingDoc(null);
    setNewFilename('');
    setNewCategory('grading_policy');
    setNewContent('');
  };

  const handleCreateDocument = async () => {
    if (!newFilename || !newContent) {
      toast.error('Please fill in filename and content fields.');
      return;
    }
    const filenameWithExt = newFilename.endsWith('.txt') ? newFilename : `${newFilename}.txt`;
    try {
      const result = await adminApi.createKbDocument({
        filename: filenameWithExt,
        content: newContent,
        category: newCategory,
      });
      toast.success(`Created document ${filenameWithExt} successfully.`);
      setIndexStatusMessage(result?.indexStatus === 'sparse' && result?.retrievalEligible
        ? `Created ${filenameWithExt}; approved sparse retrieval can use its database content immediately.`
        : result?.indexStatus === 'sparse'
        ? `Created ${filenameWithExt}; add it to ARIA's approved source list before retrieval can use it.`
        : `Created ${filenameWithExt}; retrieval synchronization is pending and has not been confirmed.`);
      setIsAdding(false);
      loadDocuments();
    } catch (err) {
      console.error('Failed to create document:', err);
      toast.error(knowledgeBaseErrorMessage(err, 'create'));
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (!confirm(`Archive ${filename}? It will become inactive and unavailable to ARIA retrieval.`)) {
      return;
    }
    try {
      await adminApi.deleteKbDocument(filename);
      toast.success(`Archived ${filename}.`);
      setIndexStatusMessage(`Archived ${filename}; its vectors were invalidated and it is no longer active for retrieval.`);
      loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error(knowledgeBaseErrorMessage(err, 'archive'));
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const result = await adminApi.reindexKb();
      if (result?.status === 'indexed') {
        toast.success('Knowledge base indexing completed.');
        setIndexStatusMessage('The service confirmed indexing completed.');
      } else if (result?.status === 'not_required') {
        toast.success('Approved sources are read directly in sparse mode; vector re-indexing is not needed.');
        setIndexStatusMessage(result.message ?? 'Vector re-indexing is not required in sparse retrieval mode.');
      } else if (result?.status === 'accepted' || result?.status === 'pending') {
        toast.message('Knowledge base indexing is pending; completion has not been confirmed.');
        setIndexStatusMessage('Indexing was accepted. Per-document completion status appears in the table.');
      } else {
        toast.error('Indexing did not return a confirmed completion status.');
        setIndexStatusMessage('Indexing completion could not be confirmed.');
      }
      await loadDocuments();
    } catch (err) {
      console.error('Reindexing failed:', err);
      const message = knowledgeBaseErrorMessage(err, 'reindex');
      toast.error(message);
      setIndexStatusMessage(message);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-6xl space-y-6">
        
        {/* Header Section */}
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2">
              <BookOpen className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              Policy library
            </h1>
            <p className="portal-description mt-2">
              Manage ARIA source documents stored in the portal database. Retrieval availability is shown with each source.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleReindex}
              disabled={reindexing}
              variant="outline"
              aria-label={reindexing ? 'Re-indexing knowledge base' : 'Re-index knowledge base embeddings'}
            >
              <Database className="h-4 w-4" />
              {reindexing ? 'Re-indexing...' : 'Re-index Embeddings'}
            </Button>
            <Button
              onClick={handleAddClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Policy File
            </Button>
          </div>
        </div>

        {indexStatusMessage && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status" aria-live="polite">{indexStatusMessage}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Document list */}
          <div className={editingDoc || isAdding ? 'lg:col-span-6 space-y-4' : 'lg:col-span-12 space-y-4'}>
            <div className="portal-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e8f0f5] bg-[#fbfdfe] p-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Policy Files</span>
                <Button
                  onClick={loadDocuments}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-[10px] font-bold p-1 h-7 rounded-lg flex items-center gap-1 transition shadow-sm"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh List
                </Button>
              </div>

              <div className="overflow-x-auto" role="region" aria-label="Policy library table" tabIndex={0}>
              <Table className="min-w-[740px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Filename</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Category</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Updated / Index</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Loading database records...
                      </TableCell>
                    </TableRow>
                  ) : loadError ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-rose-700" role="alert">{loadError}</TableCell>
                    </TableRow>
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <TableRow key={doc.filename} className="hover:bg-slate-55/30">
                        <TableCell className="font-medium text-slate-800 flex items-center gap-2 py-3.5">
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="font-mono text-xs">{doc.filename}</span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold uppercase">
                            {doc.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : 'Update time unavailable'}</div>
                          <div className="mt-1">{doc.active === false ? 'Archived' : 'Active'}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide">
                            {doc.indexStatus === 'sparse'
                              ? doc.retrievalEligible ? 'Retrieval: sparse ready' : 'Retrieval: source approval required'
                              : `Index: ${doc.indexStatus ?? 'unknown'}`}
                          </div>
                          {doc.indexedAt && <div>Indexed: {new Date(doc.indexedAt).toLocaleString()}</div>}
                          {doc.indexError && <div className="mt-1 text-rose-700" role="status">{doc.indexError}</div>}
                          {doc.version && <div>Version: {doc.version}</div>}
                          {doc.effectiveDate && <div>Effective: {doc.effectiveDate}</div>}
                        </TableCell>
                        <TableCell className="text-right py-3.5 space-x-1.5">
                          <Button
                            onClick={() => handleEditClick(doc)}
                            aria-label={`Edit ${doc.filename}`}
                            disabled={doc.active === false}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-1.5 h-8 rounded-lg shadow-sm"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteDocument(doc.filename)}
                            aria-label={`Archive ${doc.filename}`}
                            disabled={doc.active === false}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1.5 h-8 rounded-lg shadow-sm"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        No stored policy documents. The database list loaded successfully.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>

          {/* Edit / Add sidebar form */}
          {(editingDoc || isAdding) && (
            <div className="portal-surface lg:col-span-6 h-fit space-y-4 p-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {isAdding ? 'Create Policy File' : `Editing ${editingDoc?.filename}`}
                </h3>
                <Button
                  onClick={() => { setEditingDoc(null); setIsAdding(false); }}
                  className="bg-white hover:bg-slate-100 border border-slate-250 text-slate-600 p-1 h-7 w-7 rounded-lg shadow-sm flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isAdding && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Filename</label>
                    <input
                      type="text"
                      placeholder="e.g. grading_rules"
                      value={newFilename}
                      onChange={(e) => setNewFilename(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-900 rounded-xl text-xs outline-none focus:border-blue-500 transition-all font-mono"
                    />
                    <p className="text-[9px] text-slate-400 font-semibold">Use letters, numbers, dot, underscore, or hyphen. System appends .txt if omitted.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    >
                      <option value="grading_policy">grading_policy</option>
                      <option value="enrollment_policy">enrollment_policy</option>
                      <option value="document_request">document_request</option>
                      <option value="general_policy">general_policy</option>
                      <option value="official_advice">official_advice</option>
                      <option value="programs_curriculum">programs_curriculum</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Document Text Content</label>
                <textarea
                  rows={15}
                  placeholder="Paste or write the handbook policies here..."
                  value={isAdding ? newContent : editingDoc?.content || ''}
                  onChange={(e) => {
                    if (isAdding) {
                      setNewContent(e.target.value);
                    } else if (editingDoc) {
                      setEditingDoc({ ...editingDoc, content: e.target.value });
                    }
                  }}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-800 rounded-xl text-xs font-mono outline-none focus:border-blue-500 transition-all leading-relaxed resize-y"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={isAdding ? handleCreateDocument : handleSaveEdit}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {isAdding ? 'Create File' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => { setEditingDoc(null); setIsAdding(false); }}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </Button>
              </div>

            </div>
          )}

        </div>

      </main>

      <PageFooter type="general" />
    </div>
  );
}
