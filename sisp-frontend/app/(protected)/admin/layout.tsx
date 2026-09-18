'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopHeader } from '@/components/admin/layout/AdminTopHeader';

const STORAGE_KEY = 'sisp_admin_sidebar_collapsed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f8fbfd] antialiased">
      {/* Collapsible Left Side Navigation */}
      <AdminSidebar
        isCollapsed={mounted ? isCollapsed : false}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopHeader onOpenMobile={() => setMobileOpen(true)} />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
