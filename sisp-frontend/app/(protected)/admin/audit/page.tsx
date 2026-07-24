'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api/admin';
import { Navbar } from '@/components/shared/Navbar';
import { AmbientBackground } from '@/components/shared/AmbientBackground';
import { PageFooter } from '@/components/shared/PageFooter';
import { Button } from '@/components/ui/button';
import {
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    email: string;
    role?: { name: string };
  };
}

interface AuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  useAuth();
  const [logs, setLogs] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [resourceFilter, setResourceFilter] = useState('');

  const loadLogs = async (p: number = page, resource?: string) => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(p, 20, resource || undefined);
      setLogs(res);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadLogs(newPage, resourceFilter);
  };

  const handleFilterChange = (resource: string) => {
    setResourceFilter(resource);
    setPage(1);
    loadLogs(1, resource);
  };

  const RESOURCE_OPTIONS = ['', 'auth', 'users', 'grades', 'documents', 'chat', 'enrollment'];

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden select-none">
      <AmbientBackground topColor="bg-amber-500/5" bottomColor="bg-orange-600/5" />
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6 z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-amber-600" />
              Security Audit Logs
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              System-wide mutation trail — all create, update, and delete operations.
            </p>
          </div>
          <Button
            onClick={() => loadLogs(page, resourceFilter)}
            className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter by Resource:</span>
          <select
            value={resourceFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-amber-400"
          >
            <option value="">All Resources</option>
            {RESOURCE_OPTIONS.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {logs && (
            <span className="text-[10px] text-slate-400 font-bold ml-auto">
              {logs.total} total records • Page {logs.page} of {logs.totalPages}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">User</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Role</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Action</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Resource</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Resource ID</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs && logs.data.length > 0 ? (
                  logs.data.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {log.user?.email || log.userId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase">
                          {log.user?.role?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          log.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                          log.action === 'POST' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{log.resource}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{log.resourceId || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{log.ipAddress || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      No audit log records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {logs && logs.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs font-bold text-slate-500">
              Page {page} of {logs.totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= logs.totalPages}
              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <PageFooter type="cryptographic" />
    </div>
  );
}
