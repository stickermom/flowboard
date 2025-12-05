'use client';

import type { AdminPage } from '@/adminTypes';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import CustomersPage from '@/pages/admin/CustomersPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import OrdersPage from '@/pages/admin/OrdersPage';
import ProductsPage from '@/pages/admin/ProductsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import AdminLogin from '@/pages/AdminLogin';
import { useState } from 'react';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const { isAuthenticated, loading } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-slate-900 dark:border-neutral-700 dark:border-t-neutral-100 mb-4"></div>
          <p className="text-slate-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'products' && <ProductsPage />}
      {currentPage === 'orders' && <OrdersPage />}
      {currentPage === 'customers' && <CustomersPage />}
      {currentPage === 'categories' && <CategoriesPage />}
      {currentPage === 'analytics' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Analytics</h2>
          <p className="text-slate-600 dark:text-neutral-400">Advanced analytics coming soon</p>
        </div>
      )}
      {currentPage === 'settings' && <SettingsPage />}
    </AdminLayout>
  );
}

