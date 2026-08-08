'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/shared/Navbar';
import { PageFooter } from '@/components/shared/PageFooter';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin';
import {
  BookOpen,
  RefreshCw,
  Edit,
  Plus,
  Trash2,
  FileText,
  Save,
  X,
  Database,
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
  category: string;
  content: string;
  sizeBytes: number;
  lastModified: number;
}

export default function KbManagementPage() {
  useAuth();
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

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
    } catch (err) {
      console.error('Failed to load KB documents:', err);
      toast.error('Failed to load knowledge base files.');
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
      await adminApi.updateKbDocument(editingDoc.filename, editingDoc.content);
      toast.success(`Updated ${editingDoc.filename} successfully.`);
      setEditingDoc(null);
      loadDocuments();
    } catch (err) {
      console.error('Failed to save document:', err);
      toast.error('Failed to save document modifications.');
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
      await adminApi.createKbDocument({
        filename: filenameWithExt,
        content: newContent,
        category: newCategory,
      });
      toast.success(`Created document ${filenameWithExt} successfully.`);
      setIsAdding(false);
      loadDocuments();
    } catch (err) {
      console.error('Failed to create document:', err);
      toast.error('Failed to create knowledge base document.');
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}? This action is irreversible.`)) {
      return;
    }
    try {
      await adminApi.deleteKbDocument(filename);
      toast.success(`Deleted ${filename} successfully.`);
      loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error('Failed to delete document.');
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await adminApi.reindexKb();
      toast.success('KB re-indexing task triggered in background.');
    } catch (err) {
      console.error('Reindexing failed:', err);
      toast.error('Failed to trigger KB re-indexing.');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="portal-page">
      <Navbar />

      <main className="portal-main max-w-6xl space-y-6">
        
        {/* Header Section */}
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2">
              <BookOpen className="size-6 text-[#0a439b]" strokeWidth={1.8} />
              Policy library
            </h1>
            <p className="portal-description mt-2">
              Manage the approved policy sources used by ARIA.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleReindex}
              disabled={reindexing}
              variant="outline"
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
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Filename</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Category</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[9px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Scanning KB Directory...
                      </TableCell>
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
                        <TableCell className="text-right py-3.5 space-x-1.5">
                          <Button
                            onClick={() => handleEditClick(doc)}
                            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-1.5 h-8 rounded-lg shadow-sm"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteDocument(doc.filename)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1.5 h-8 rounded-lg shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        No policy documents found
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
                    <p className="text-[9px] text-slate-400 font-semibold">System automatically appends .txt suffix if omitted.</p>
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
