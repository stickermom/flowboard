import { ReactNode, useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { AdminPage } from '../../adminTypes';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

export default function AdminLayout({ children, currentPage, onNavigate }: AdminLayoutProps) {
  const { adminUser, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as const, label: 'Products', icon: Package },
    { id: 'orders' as const, label: 'Orders', icon: ShoppingCart },
    { id: 'customers' as const, label: 'Customers', icon: Users },
    { id: 'categories' as const, label: 'Categories', icon: FolderTree },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 text-neutral-100 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-end p-4 border-b border-neutral-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <span className="sr-only">Close navigation</span>
            <X size={24} />
          </button>
        </div>
        <div className="px-6 pt-6 pb-5 border-b border-neutral-800">
          <div
            className="h-16 rounded-xl border border-neutral-700 bg-neutral-900/40 flex items-center justify-center"
            aria-label="Store logo container"
          >
            <span className="sr-only">Store logo</span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-200 text-slate-900 dark:bg-neutral-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-800">
          <div className="mb-3 px-4">
            <p className="font-medium text-sm text-neutral-100">{adminUser?.name}</p>
            <p className="text-xs text-neutral-400">{adminUser?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 min-h-screen bg-slate-50 dark:bg-neutral-950 transition-colors">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-neutral-900 dark:border-neutral-800 lg:hidden">
          <div className="px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Menu size={24} className="text-slate-700 dark:text-neutral-200" />
              <span className="sr-only">Open navigation</span>
            </button>
          </div>
        </header>

        <main className="p-6 transition-colors">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
