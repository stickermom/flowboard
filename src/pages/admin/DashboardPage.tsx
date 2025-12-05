'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatINR } from '../../lib/currency';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertCircle,
  Eye
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  recentOrders: any[];
  topProducts: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    recentOrders: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [ordersResult, productsResult] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
    ]);

    const orders = ordersResult.data || [];
    const products = productsResult.data || [];

    const completedOrders = orders.filter((o: any) => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum: number, order: any) => sum + order.total, 0);

    const lowStockProducts = products.filter(
      (p: any) => p.track_inventory && p.inventory_quantity < 10
    );

    const productSales = new Map();
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const productId = item.product.id;
        const current = productSales.get(productId) || { ...item.product, totalSold: 0 };
        current.totalSold += item.quantity;
        productSales.set(productId, current);
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    setStats({
      totalRevenue,
      totalOrders: orders.length,
      totalProducts: products.length,
      lowStockProducts: lowStockProducts.length,
      recentOrders: orders.slice(0, 5),
      topProducts,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-slate-900 dark:border-neutral-700 dark:border-t-neutral-100"></div>
        <p className="text-slate-600 dark:text-neutral-400 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-neutral-400 mt-1">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-500/10 rounded-lg">
              <DollarSign size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
              <TrendingUp size={16} />
              <span>+12%</span>
            </div>
          </div>
          <p className="text-slate-600 dark:text-neutral-400 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatINR(stats.totalRevenue)}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
              <ShoppingCart size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
              <TrendingUp size={16} />
              <span>+8%</span>
            </div>
          </div>
          <p className="text-slate-600 dark:text-neutral-400 text-sm mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalOrders}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
              <Package size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-slate-600 dark:text-neutral-400 text-sm mb-1">Total Products</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalProducts}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-500/10 rounded-lg">
              <AlertCircle size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-slate-600 dark:text-neutral-400 text-sm mb-1">Low Stock Items</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.lowStockProducts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Orders</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-neutral-800">
            {stats.recentOrders.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-neutral-400">
                No orders yet
              </div>
            ) : (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900 dark:text-white">{order.order_number}</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-neutral-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatINR(order.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Products</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-neutral-800">
            {stats.topProducts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-neutral-400">
                No sales data yet
              </div>
            ) : (
              stats.topProducts.map((product, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{product.title}</p>
                      <p className="text-sm text-slate-600 dark:text-neutral-400">{product.totalSold} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 dark:text-white">{formatINR(product.price)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {stats.lowStockProducts > 0 && (
        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/10 rounded-lg">
              <AlertCircle size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">Low Stock Alert</h3>
              <p className="text-orange-800 dark:text-orange-200/80 text-sm">
                You have {stats.lowStockProducts} product{stats.lowStockProducts > 1 ? 's' : ''} with low inventory.
                Consider restocking soon to avoid running out.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
