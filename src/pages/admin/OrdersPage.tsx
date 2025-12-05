'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Eye, Package, Calendar, DollarSign, RefreshCcw } from 'lucide-react';
import OrderDetailsModal from '../../components/admin/OrderDetailsModal';
import { formatINR } from '../../lib/currency';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  items: any[];
  created_at: string;
  updated_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, field: string, value: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ [field]: value })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    revenue: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="text-slate-600 dark:text-neutral-400">Manage and track customer orders.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-neutral-200 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Total orders</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <Package size={24} className="text-slate-400 dark:text-neutral-500" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <Calendar size={24} className="text-yellow-500 dark:text-yellow-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Completed</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.completed}</p>
            </div>
            <Package size={24} className="text-green-500 dark:text-green-400" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Revenue</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{formatINR(stats.revenue)}</p>
            </div>
              <DollarSign size={24} className="text-slate-400 dark:text-neutral-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-slate-900 dark:border-neutral-700 dark:border-t-neutral-100"></div>
          <p className="text-slate-600 dark:text-neutral-400 mt-4">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Package size={48} className="mx-auto text-slate-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No orders found</h3>
          <p className="text-slate-600 dark:text-neutral-400">Orders will appear here once customers make purchases</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Fulfillment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">{order.order_number}</p>
                      <p className="text-xs text-slate-500 dark:text-neutral-400">{order.items.length} items</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 dark:text-neutral-200">{order.customer_email || 'Guest'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">{formatINR(order.total)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.payment_status || 'pending'}
                        onChange={(e) => handleStatusUpdate(order.id, 'payment_status', e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300 ${
                          order.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                            : order.payment_status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.fulfillment_status || 'unfulfilled'}
                        onChange={(e) => handleStatusUpdate(order.id, 'fulfillment_status', e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300 ${
                          order.fulfillment_status === 'fulfilled'
                            ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                            : order.fulfillment_status === 'shipped'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        <option value="unfulfilled">Unfulfilled</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="fulfilled">Fulfilled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} className="text-slate-600 dark:text-neutral-300" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  );
}
