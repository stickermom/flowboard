'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, EyeOff, FolderTree, Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CategoryFormModal from '../../components/admin/CategoryFormModal';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

type SortKey = 'name' | 'display_order' | 'created_at';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('display_order');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    const { data, error: supabaseError } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (supabaseError) {
      setError(supabaseError.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories((data || []) as Category[]);
    setLoading(false);
  };

  const handleToggleActive = async (category: Category) => {
    const { error: supabaseError } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);

    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    fetchCategories();
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    const { error: supabaseError } = await supabase.from('categories').delete().eq('id', categoryId);
    if (supabaseError) {
      setError(supabaseError.message);
      return;
    }

    fetchCategories();
  };

  const filteredCategories = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    return categories
      .filter((category) => {
        const matchesSearch =
          !term ||
          category.name.toLowerCase().includes(term) ||
          category.slug.toLowerCase().includes(term) ||
          category.description?.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && category.is_active) ||
          (statusFilter === 'inactive' && !category.is_active);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortKey === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortKey === 'created_at') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.display_order - b.display_order;
      });
  }, [categories, searchQuery, statusFilter, sortKey]);

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((category) => category.is_active).length;
    const inactive = total - active;
    return {
      total,
      active,
      inactive,
    };
  }, [categories]);

  const parentLookup = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    fetchCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Categories</h1>
          <p className="text-slate-600 dark:text-neutral-400">Organise collections and control storefront navigation.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-neutral-100 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          New category
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Total categories</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <FolderTree className="text-slate-400 dark:text-neutral-500" size={28} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Active</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
            <Eye className="text-emerald-500 dark:text-emerald-400" size={28} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-neutral-400">Hidden</p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{stats.inactive}</p>
            </div>
            <EyeOff className="text-amber-500 dark:text-amber-400" size={28} />
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
              placeholder="Search by name or slug"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 py-2 pl-10 pr-4 focus:border-slate-900 dark:focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-neutral-300/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-slate-900 dark:focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-neutral-300/30"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-slate-900 dark:focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-neutral-300/30"
            >
              <option value="display_order">Sort by display order</option>
              <option value="name">Sort A → Z</option>
              <option value="created_at">Newest first</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {error && (
          <div className="border-b border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}
        {loading ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-slate-500 dark:text-neutral-400">
            <BarChart3 className="animate-pulse text-slate-400 dark:text-neutral-500" size={40} />
            <p className="text-sm">Loading categories…</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-slate-500 dark:text-neutral-400">
            <FolderTree size={40} className="text-slate-400 dark:text-neutral-500" />
            <p className="text-sm">No categories match your filters.</p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-neutral-200 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              <Plus size={16} />
              Add your first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-800">
              <thead className="bg-slate-50 dark:bg-neutral-900/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Parent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Display order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{category.name}</span>
                        {category.description && (
                          <span className="text-xs text-slate-500 dark:text-neutral-400">{category.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">{category.slug}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">
                      {category.parent_id ? parentLookup.get(category.parent_id) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">{category.display_order}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          category.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="rounded-lg border border-slate-300 dark:border-neutral-700 p-2 text-slate-600 dark:text-neutral-300 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
                          aria-label="Edit category"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(category)}
                          className="rounded-lg border border-slate-300 dark:border-neutral-700 p-2 text-slate-600 dark:text-neutral-300 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
                          aria-label={category.is_active ? 'Hide category' : 'Show category'}
                        >
                          {category.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="rounded-lg border border-slate-300 dark:border-neutral-700 p-2 text-slate-600 dark:text-neutral-300 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          aria-label="Delete category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CategoryFormModal
          category={editingCategory}
          categories={categories}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
