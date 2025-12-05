'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, Eye, MapPin, RefreshCcw, Search, UserCircle, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OrderRecord {
  id: string;
  user_id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

interface AddressRecord {
  id: string;
  user_id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface PreferenceRecord {
  id?: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  newsletter: boolean;
}

interface CustomerSummary {
  userId: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  defaultAddress: AddressRecord | null;
  preferences: PreferenceRecord | null;
}

interface CustomerDetail extends CustomerSummary {
  orders: OrderRecord[];
  addresses: AddressRecord[];
}

type PreferenceKey = 'email_notifications' | 'sms_notifications' | 'newsletter';

type CustomerMap = Record<string, CustomerDetail>;

const defaultPreferenceValue: Record<PreferenceKey, boolean> = {
  email_notifications: true,
  sms_notifications: false,
  newsletter: true,
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [customerMap, setCustomerMap] = useState<CustomerMap>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');

    const [{ data: ordersData, error: ordersError }, { data: addressesData, error: addressesError }, { data: preferencesData, error: preferencesError }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('addresses').select('*'),
      supabase.from('user_preferences').select('*'),
    ]);

    if (ordersError || addressesError || preferencesError) {
      const firstError = ordersError || addressesError || preferencesError;
      setError(firstError?.message || 'Failed to load customers');
      setCustomers([]);
      setCustomerMap({});
      setLoading(false);
      return;
    }

    const map = new Map<string, CustomerDetail>();

    (ordersData || []).forEach((order: any) => {
      const existing: CustomerDetail = map.get(order.user_id) ?? {
        userId: order.user_id,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        defaultAddress: null,
        preferences: null,
        orders: [],
        addresses: [],
      };

      const orderRecord: OrderRecord = {
        id: order.id,
        user_id: order.user_id,
        order_number: order.order_number,
        total: Number(order.total),
        status: order.status,
        created_at: order.created_at,
      };

      existing.totalOrders += 1;
      existing.totalSpent += Number(order.total);
      existing.orders.push(orderRecord);

      if (!existing.lastOrderDate || new Date(order.created_at) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.created_at;
      }

      map.set(order.user_id, existing);
    });

    (addressesData || []).forEach((address: any) => {
      const existing: CustomerDetail = map.get(address.user_id) ?? {
        userId: address.user_id,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        defaultAddress: null,
        preferences: null,
        orders: [],
        addresses: [],
      };

      const addressRecord: AddressRecord = {
        id: address.id,
        user_id: address.user_id,
        name: address.name,
        street: address.street,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
        is_default: address.is_default,
      };

      existing.addresses.push(addressRecord);
      if (address.is_default || !existing.defaultAddress) {
        existing.defaultAddress = addressRecord;
      }

      map.set(address.user_id, existing);
    });

    (preferencesData || []).forEach((preference: any) => {
      const existing: CustomerDetail = map.get(preference.user_id) ?? {
        userId: preference.user_id,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        defaultAddress: null,
        preferences: null,
        orders: [],
        addresses: [],
      };

      const prefRecord: PreferenceRecord = {
        id: preference.id,
        user_id: preference.user_id,
        email_notifications: preference.email_notifications,
        sms_notifications: preference.sms_notifications,
        newsletter: preference.newsletter,
      };

      existing.preferences = prefRecord;
      map.set(preference.user_id, existing);
    });

    const list = Array.from(map.values()).map((entry) => ({
      userId: entry.userId,
      totalOrders: entry.totalOrders,
      totalSpent: entry.totalSpent,
      lastOrderDate: entry.lastOrderDate,
      defaultAddress: entry.defaultAddress,
      preferences: entry.preferences,
    }));

    list.sort((a, b) => b.totalSpent - a.totalSpent);

    const lookup: CustomerMap = {};
    map.forEach((value, key) => {
      lookup[key] = {
        ...value,
        orders: value.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      };
    });

    setCustomers(list);
    setCustomerMap(lookup);
    setLoading(false);
  };

  const filteredCustomers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => {
      const addressMatches = customer.defaultAddress
        ? `${customer.defaultAddress.name} ${customer.defaultAddress.city} ${customer.defaultAddress.state}`
            .toLowerCase()
            .includes(term)
        : false;
      return customer.userId.toLowerCase().includes(term) || addressMatches;
    });
  }, [customers, searchQuery]);

  const totals = useMemo(() => {
    const totalCustomers = customers.length;
    const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0);
    const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    const repeatCustomers = customers.filter((customer) => customer.totalOrders > 1).length;
    return {
      totalCustomers,
      totalOrders,
      totalRevenue,
      repeatRate: totalCustomers ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
      averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
    };
  }, [customers]);

  const handlePreferenceChange = async (customerId: string, key: PreferenceKey, value: boolean) => {
    const current = customerMap[customerId];
    if (!current) return;

    setPreferenceSaving(true);

    const payload: PreferenceRecord = {
      user_id: customerId,
      email_notifications:
        key === 'email_notifications'
          ? value
          : current.preferences?.email_notifications ?? defaultPreferenceValue.email_notifications,
      sms_notifications:
        key === 'sms_notifications'
          ? value
          : current.preferences?.sms_notifications ?? defaultPreferenceValue.sms_notifications,
      newsletter:
        key === 'newsletter'
          ? value
          : current.preferences?.newsletter ?? defaultPreferenceValue.newsletter,
    };

    const { data, error: supabaseError } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (supabaseError) {
      console.error('Failed to update preferences', supabaseError);
      setPreferenceSaving(false);
      return;
    }

    const updatedPreference: PreferenceRecord = data ?? payload;

    setCustomerMap((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        preferences: updatedPreference,
      },
    }));

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.userId === customerId ? { ...customer, preferences: updatedPreference } : customer
      )
    );

    setSelectedCustomer((prev) =>
      prev && prev.userId === customerId ? { ...prev, preferences: updatedPreference } : prev
    );

    setPreferenceSaving(false);
  };

  const renderPreferenceToggle = (label: string, description: string, key: PreferenceKey, customer: CustomerDetail) => {
    const value = customer.preferences ? customer.preferences[key] : defaultPreferenceValue[key];
    return (
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 transition-colors">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{description}</p>
        </div>
        <input
          type="checkbox"
          checked={value}
          disabled={preferenceSaving}
          onChange={(event) => handlePreferenceChange(customer.userId, key, event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:ring-slate-900 dark:focus:ring-neutral-300"
        />
      </label>
    );
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="text-slate-600 dark:text-neutral-400">Monitor customer health, loyalty, and communication preferences.</p>
        </div>
        <button
          onClick={fetchCustomers}
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
              <p className="text-sm text-slate-500 dark:text-neutral-400">Customers</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totals.totalCustomers}</p>
            </div>
            <Users className="text-slate-400 dark:text-neutral-500" size={28} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Orders</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totals.totalOrders}</p>
            </div>
            <BarChart3 className="text-slate-400 dark:text-neutral-500" size={28} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Lifetime value</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{currencyFormatter.format(totals.totalRevenue)}</p>
            </div>
            <ArrowUpRight className="text-emerald-500 dark:text-emerald-400" size={28} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Repeat purchase rate</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totals.repeatRate}%</p>
            </div>
            <UserCircle className="text-slate-400 dark:text-neutral-500" size={28} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by email or default address"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 py-2 pl-10 pr-4 focus:border-slate-900 dark:focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-neutral-300/30"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {error && <div className="border-b border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
        {loading ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-slate-500 dark:text-neutral-400">
            <Users className="animate-pulse text-slate-400 dark:text-neutral-500" size={40} />
            <p className="text-sm">Loading customers…</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-slate-500 dark:text-neutral-400">
            <UserCircle size={40} className="text-slate-400 dark:text-neutral-500" />
            <p className="text-sm">No customers match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-800">
              <thead className="bg-slate-50 dark:bg-neutral-900/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Lifetime value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Last order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Default address</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.userId} className="hover:bg-slate-50 dark:hover:bg-neutral-800">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{customer.userId}</span>
                        {customer.preferences && (
                          <span className="text-xs text-slate-500 dark:text-neutral-400">
                            Marketing: {customer.preferences.newsletter ? 'Subscribed' : 'Unsubscribed'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">{customer.totalOrders}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">
                      {currencyFormatter.format(customer.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">{formatDate(customer.lastOrderDate)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">
                      {customer.defaultAddress ? (
                        <span>
                          {customer.defaultAddress.city}, {customer.defaultAddress.state}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          const detail = customerMap[customer.userId];
                          if (detail) {
                            setSelectedCustomer(detail);
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-neutral-700 p-2 text-slate-700 dark:text-neutral-200 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800"
                        title="View profile"
                        aria-label="View profile"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl dark:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.8)] transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Customer profile</h2>
                <p className="text-sm text-slate-500 dark:text-neutral-400">{selectedCustomer.userId}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-full p-2 text-slate-500 dark:text-neutral-400 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                  <header className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent orders</h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400">Track fulfillment and payment status</p>
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-neutral-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-neutral-300">
                      {selectedCustomer.totalOrders} orders
                    </span>
                  </header>
                  {selectedCustomer.orders.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500 dark:text-neutral-400">No orders yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-800 text-sm">
                        <thead className="bg-slate-50 dark:bg-neutral-900/60">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-300">Order</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-300">Date</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-300">Total</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-300">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                          {selectedCustomer.orders.map((order) => (
                            <tr key={order.id}>
                              <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{order.order_number}</td>
                              <td className="px-4 py-2 text-slate-600 dark:text-neutral-400">{formatDate(order.created_at)}</td>
                              <td className="px-4 py-2 text-slate-600 dark:text-neutral-400">{currencyFormatter.format(order.total)}</td>
                              <td className="px-4 py-2">
                                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 dark:text-neutral-300">
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                  <header className="border-b border-slate-200 dark:border-neutral-800 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Addresses</h3>
                  </header>
                  {selectedCustomer.addresses.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500 dark:text-neutral-400">No addresses on file.</div>
                  ) : (
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      {selectedCustomer.addresses.map((address) => (
                        <div
                          key={address.id}
                          className={`rounded-lg border px-4 py-3 text-sm ${
                            address.is_default
                              ? 'border-slate-900 bg-slate-900/5 dark:border-neutral-200 dark:bg-neutral-200/10'
                              : 'border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                          }`}
                        >
                          <p className="font-semibold text-slate-900 dark:text-white">{address.name}</p>
                          <p className="text-slate-600 dark:text-neutral-400">{address.street}</p>
                          <p className="text-slate-600 dark:text-neutral-400">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          <p className="text-slate-500 dark:text-neutral-400 text-xs mt-2">{address.country}</p>
                          {address.is_default && (
                            <span className="mt-2 inline-flex items-center rounded-full bg-slate-900 dark:bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white dark:text-neutral-900">
                              Default
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                  <header className="border-b border-slate-200 dark:border-neutral-800 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Insights</h3>
                  </header>
                  <div className="space-y-3 p-4 text-sm text-slate-600 dark:text-neutral-400">
                    <div className="flex items-center justify-between">
                      <span>Lifetime value</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {currencyFormatter.format(selectedCustomer.totalSpent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Orders</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.totalOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last order</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedCustomer.lastOrderDate)}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                  <header className="border-b border-slate-200 dark:border-neutral-800 px-4 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Communication preferences
                    </h3>
                  </header>
                  <div className="space-y-3 p-4">
                    {renderPreferenceToggle(
                      'Email updates',
                      'Send order confirmations, shipping updates, and product recommendations.',
                      'email_notifications',
                      selectedCustomer
                    )}
                    {renderPreferenceToggle(
                      'SMS alerts',
                      'Deliver time-sensitive updates or delivery notifications.',
                      'sms_notifications',
                      selectedCustomer
                    )}
                    {renderPreferenceToggle(
                      'Marketing newsletter',
                      'Share campaigns and product launches with opted-in customers.',
                      'newsletter',
                      selectedCustomer
                    )}
                  </div>
                </section>

                {selectedCustomer.defaultAddress && (
                  <section className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                    <header className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <MapPin size={16} className="text-slate-600 dark:text-neutral-300" />
                      Default shipping address
                    </header>
                    <div className="space-y-2 p-4 text-sm text-slate-600 dark:text-neutral-400">
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.defaultAddress.name}</p>
                      <p>{selectedCustomer.defaultAddress.street}</p>
                      <p className="text-slate-600 dark:text-neutral-400">
                        {selectedCustomer.defaultAddress.city}, {selectedCustomer.defaultAddress.state}{' '}
                        {selectedCustomer.defaultAddress.postal_code}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-neutral-400">{selectedCustomer.defaultAddress.country}</p>
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
