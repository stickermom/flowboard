'use client';

import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div className="dark min-h-screen bg-slate-50 dark:bg-neutral-950">
        {children}
      </div>
    </AdminAuthProvider>
  );
}

