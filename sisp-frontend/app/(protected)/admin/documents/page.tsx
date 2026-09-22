'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  requestsApi,
  DocumentCatalogItem,
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
} from '@/lib/api/requests';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Clock,
  UserCheck,
  Tag,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';

export default function AdminDocumentsPage() {
  useAuth();
  const [catalog, setCatalog] = useState<DocumentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Create/Edit
  const [editingItem, setEditingItem] = useState<DocumentCatalogItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<DocumentCatalogItem | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    label: '',
    fee: '',
    feeNote: '',
    tat: '',
    assignedTo: '',
    sortOrder: 10,
    isActive: true,
  });

  const loadCatalog = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await requestsApi.getCatalog(true);
      setCatalog(data || []);
    } catch (err: any) {
      console.error('Failed to load document catalog:', err);
      setLoadError('The document catalog could not be loaded. Please try again.');
      toast.error('Unable to fetch document catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      if (filterActive === 'active' && !item.isActive) return false;
      if (filterActive === 'inactive' && item.isActive) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(q)) ||
        (item.tat && item.tat.toLowerCase().includes(q))
      );
    });
  }, [catalog, search, filterActive]);

  const handleOpenCreate = () => {
    const nextSort = catalog.length ? Math.max(...catalog.map((c) => c.sortOrder ?? 0)) + 5 : 10;
    setFormData({
      code: '',
      label: '',
      fee: '',
      feeNote: '',
      tat: '',
      assignedTo: '',
      sortOrder: nextSort,
      isActive: true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: DocumentCatalogItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      label: item.label,
      fee: String(item.fee),
      feeNote: item.feeNote || '',
      tat: item.tat || '',
      assignedTo: item.assignedTo || '',
      sortOrder: item.sortOrder ?? 10,
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (item: DocumentCatalogItem) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.label.trim()) {
      toast.error('Code and Document Name are required');
      return;
    }
    const fee = Number(formData.fee);
    if (!formData.fee.trim() || !Number.isFinite(fee) || fee < 0) {
      toast.error('Enter an institution-approved fee, including 0 when the document is free.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateCatalogItemPayload = {
        code: formData.code.trim().toLowerCase().replace(/\s+/g, '_'),
        label: formData.label.trim(),
        fee,
        feeNote: formData.feeNote.trim() || undefined,
        tat: formData.tat.trim() || undefined,
        assignedTo: formData.assignedTo.trim() || undefined,
        sortOrder: Number(formData.sortOrder) || 10,
        isActive: formData.isActive,
      };

      await requestsApi.createCatalogItem(payload);
      toast.success('New document type added to catalog!');
      setIsCreateOpen(false);
      void loadCatalog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const fee = Number(formData.fee);
    if (!formData.fee.trim() || !Number.isFinite(fee) || fee < 0) {
      toast.error('Enter an institution-approved fee, including 0 when the document is free.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: UpdateCatalogItemPayload = {
        label: formData.label.trim(),
        code: formData.code.trim().toLowerCase().replace(/\s+/g, '_'),
        fee,
        feeNote: formData.feeNote.trim() || undefined,
        tat: formData.tat.trim() || undefined,
        assignedTo: formData.assignedTo.trim() || undefined,
        sortOrder: Number(formData.sortOrder) || 10,
        isActive: formData.isActive,
      };

      await requestsApi.updateCatalogItem(editingItem.id, payload);
      toast.success('Document catalog item updated!');
      setIsEditOpen(false);
      void loadCatalog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: DocumentCatalogItem) => {
    try {
      await requestsApi.updateCatalogItem(item.id, { isActive: !item.isActive });
      toast.success(`${item.label} is now ${!item.isActive ? 'Active' : 'Disabled'}`);
      setCatalog((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isActive: !item.isActive } : c))
      );
    } catch (err: any) {
      toast.error('Failed to change document status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      const res = await requestsApi.deleteCatalogItem(deletingItem.id);
      if (res.deactivated) {
        toast.info('Document has historical requests. Marked as inactive.');
      } else {
        toast.success('Document type deleted successfully.');
      }
      setIsDeleteOpen(false);
      void loadCatalog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete document');
    } finally {
      setSubmitting(false);
    }
  };

  const totalActive = catalog.filter((c) => c.isActive).length;

  return (
    <div className="flex min-h-full flex-col">
      <main className="portal-main max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="portal-page-header flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title flex items-center gap-2.5">
              <FileText className="size-6 text-[#0a439b]" strokeWidth={2} />
              Document Catalog
            </h1>
            <p className="portal-description mt-2">
              Configure available document types, set official prices, processing turnaround times (TAT), and designate in-charge registrar personnel.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCatalog}
              disabled={loading}
              className="border-[#dce7ef] text-[#365a72] hover:bg-[#f1f7fb]"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-[#0a439b] hover:bg-[#08367d] text-white shadow-sm"
            >
              <Plus className="size-3.5 mr-1" />
              Add Document
            </Button>
          </div>
        </div>

        {/* Metric Cards Banner */}
        <section className="grid grid-cols-3 divide-x divide-[#dce7ef] overflow-hidden rounded-2xl border border-[#dce7ef] bg-white shadow-[0_10px_28px_rgb(15_45_74_/_0.055)]">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[#0a439b]">
              <Tag className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#587387]">Total Documents</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#102f49]">{catalog.length}</p>
            <p className="text-[11px] text-[#587387] mt-0.5">In catalog master list</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#587387]">Active in Portal</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">{totalActive}</p>
            <p className="text-[11px] text-[#587387] mt-0.5">Available for student requests</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#587387]">Turnaround Times</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#102f49]">2d – 4w</p>
            <p className="text-[11px] text-[#587387] mt-0.5">From simple COE to TOR/CAV</p>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="portal-surface p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6c879a]" />
              <input
                type="text"
                placeholder="Search document name, code, staff, or TAT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#cbdde9] bg-[#fbfdfe] pl-10 pr-4 text-xs text-[#102f49] placeholder:text-[#6c879a] focus:border-[#0a439b] focus:outline-none focus:ring-3 focus:ring-[#0a439b]/10"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-xl bg-[#f1f6fa] p-1 border border-[#e2edf4] text-xs">
              <button
                type="button"
                onClick={() => setFilterActive('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterActive === 'all'
                    ? 'bg-white text-[#0a439b] shadow-2xs'
                    : 'text-[#587387] hover:text-[#102f49]'
                }`}
              >
                All ({catalog.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterActive('active')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterActive === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-[#587387] hover:text-[#102f49]'
                }`}
              >
                Active ({totalActive})
              </button>
              <button
                type="button"
                onClick={() => setFilterActive('inactive')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterActive === 'inactive'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-[#587387] hover:text-[#102f49]'
                }`}
              >
                Disabled ({catalog.length - totalActive})
              </button>
            </div>
          </div>

          {/* Mobile: card records (NEXT 12) */}
          <div className="space-y-3 md:hidden">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">
                <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-[#0a439b]" />
                Loading document catalog items...
              </p>
            ) : loadError ? (
              <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-center" role="alert">
                <p className="text-sm text-rose-700">{loadError}</p>
                <Button size="sm" variant="outline" onClick={() => void loadCatalog()} disabled={loading}>
                  Try again
                </Button>
              </div>
            ) : filteredCatalog.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-600">
                No documents found
              </p>
            ) : (
              filteredCatalog.map((item) => (
                <article
                  key={item.id}
                  className="space-y-3 rounded-xl border border-[#e8f0f5] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#cbdde9] bg-[#eaf3fa] font-bold text-[#0a439b]">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight text-[#102f49]">{item.label}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#587387]">{item.code}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-extrabold text-[#102f49]">
                        ₱{Number(item.fee).toFixed(2)}
                      </span>
                      {item.feeNote ? (
                        <span className="text-[10px] font-medium text-[#587387]">/ {item.feeNote}</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-800">
                      <Clock className="size-3 text-blue-600" />
                      {item.tat || 'Not specified'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <UserCheck className="size-3.5 text-slate-400" />
                      {item.assignedTo || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                        item.isActive
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${item.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`}
                      />
                      {item.isActive ? 'Active' : 'Disabled'}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleOpenEdit(item)}
                        className="text-[#365a72] hover:bg-[#eef5fa] hover:text-[#0a439b]"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleOpenDelete(item)}
                        className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Catalog Table */}
          <div className="hidden overflow-x-auto md:block" role="region" aria-label="Document Catalog Table">
            <Table className="min-w-[850px]">
              <TableHeader className="border-b border-[#e8f0f5]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500">Document Name & Code</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right">Fee / Rate</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500">Turnaround Time</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500">Person In-Charge</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-center">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-400">
                      <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-[#0a439b]" />
                      Loading document catalog items...
                    </TableCell>
                  </TableRow>
                ) : loadError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center" role="alert">
                      <p className="mb-3 text-sm text-rose-700">{loadError}</p>
                      <Button size="sm" variant="outline" onClick={() => void loadCatalog()} disabled={loading}>Try again</Button>
                    </TableCell>
                  </TableRow>
                ) : filteredCatalog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <AlertCircle className="size-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No documents found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search query or add a new document type.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCatalog.map((item) => (
                    <TableRow key={item.id} className="border-b border-[#e8f0f5] hover:bg-[#f8fbfd]">
                      <TableCell className="py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf3fa] text-[#0a439b] font-bold border border-[#cbdde9] mt-0.5">
                            <FileText className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#102f49] leading-tight">{item.label}</p>
                            <p className="text-[10px] font-mono text-[#587387] mt-0.5">{item.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-extrabold text-[#102f49]">
                            ₱{Number(item.fee).toFixed(2)}
                          </span>
                          {item.feeNote ? <span className="text-[10px] font-medium text-[#587387]">/ {item.feeNote}</span> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          <Clock className="size-3 text-blue-600" />
                          {item.tat || 'Not specified'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <UserCheck className="size-3.5 text-slate-400" />
                          <span>{item.assignedTo || 'Not specified'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title={item.isActive ? 'Click to disable' : 'Click to activate'}
                        >
                          {item.isActive ? (
                            <>
                              <span className="size-1.5 rounded-full bg-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <span className="size-1.5 rounded-full bg-slate-400" />
                              Disabled
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenEdit(item)}
                            className="text-[#365a72] hover:bg-[#eef5fa] hover:text-[#0a439b]"
                            title="Edit document"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenDelete(item)}
                            className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete or deactivate document"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* CREATE DOCUMENT MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-[#102f49]">
              <Plus className="size-4 text-[#0a439b]" />
              Add Document Type
            </DialogTitle>
            <DialogDescription className="text-xs text-[#587387]">
              Create a new document offering in the student portal catalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="block font-bold text-[#102f49] mb-1">
                Document Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Certified True Copy – Honorable Dismissal"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none focus:ring-2 focus:ring-[#0a439b]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#102f49] mb-1">
                  System Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cert_honorable_dismissal"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full font-mono rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none focus:ring-2 focus:ring-[#0a439b]/10"
                />
              </div>
              <div>
                <label className="block font-bold text-[#102f49] mb-1">
                  Unit Fee (PHP) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none focus:ring-2 focus:ring-[#0a439b]/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Pricing Unit</label>
                <select
                  value={formData.feeNote}
                  onChange={(e) => setFormData({ ...formData, feeNote: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-2.5 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                >
                  <option value="">Select unit (optional)</option>
                  <option value="copy">per copy</option>
                  <option value="per page">per page</option>
                  <option value="set">per set</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Turnaround Time (TAT)</label>
                <input
                  type="text"
                  placeholder="Institution-approved turnaround time (optional)"
                  value={formData.tat}
                  onChange={(e) => setFormData({ ...formData, tat: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Person In-Charge</label>
                <input
                  type="text"
                  placeholder="Office or person assigned (optional)"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="create-is-active"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-[#cbdde9] text-[#0a439b] focus:ring-[#0a439b]"
              />
              <label htmlFor="create-is-active" className="text-xs font-medium text-[#102f49] cursor-pointer">
                Make available immediately in Student Request portal
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0a439b] hover:bg-[#08367d] text-white"
              >
                {submitting ? 'Creating...' : 'Save Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DOCUMENT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-[#102f49]">
              <Edit2 className="size-4 text-[#0a439b]" />
              Edit Document Type
            </DialogTitle>
            <DialogDescription className="text-xs text-[#587387]">
              Update pricing, processing turnaround time, and assigned personnel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="block font-bold text-[#102f49] mb-1">
                Document Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none focus:ring-2 focus:ring-[#0a439b]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#102f49] mb-1">System Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full font-mono rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#102f49] mb-1">
                  Unit Fee (PHP) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Pricing Unit</label>
                <select
                  value={formData.feeNote}
                  onChange={(e) => setFormData({ ...formData, feeNote: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-2.5 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                >
                  <option value="">Select unit (optional)</option>
                  <option value="copy">per copy</option>
                  <option value="per page">per page</option>
                  <option value="set">per set</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Turnaround Time (TAT)</label>
                <input
                  type="text"
                  placeholder="Institution-approved turnaround time (optional)"
                  value={formData.tat}
                  onChange={(e) => setFormData({ ...formData, tat: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Person In-Charge</label>
                <input
                  type="text"
                  placeholder="Office or person assigned (optional)"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#102f49] mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-[#cbdde9] bg-white px-3 py-2 text-xs text-[#102f49] focus:border-[#0a439b] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="edit-is-active"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-[#cbdde9] text-[#0a439b] focus:ring-[#0a439b]"
              />
              <label htmlFor="edit-is-active" className="text-xs font-medium text-[#102f49] cursor-pointer">
                Active in Student Request portal
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#0a439b] hover:bg-[#08367d] text-white"
              >
                {submitting ? 'Saving...' : 'Update Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-rose-700">
              <Trash2 className="size-4 text-rose-600" />
              Remove Document Type
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to remove <strong>{deletingItem?.label}</strong> ({deletingItem?.code})?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-900">
            If this document has already been requested by students in past transactions, it will be safely deactivated from the catalog instead of corrupting student records.
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? 'Removing...' : 'Confirm Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
