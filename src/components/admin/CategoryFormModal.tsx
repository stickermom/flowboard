import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

interface CategoryFormModalProps {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: string;
  display_order: string;
  is_active: boolean;
}

const defaultFormState: FormState = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  parent_id: '',
  display_order: '0',
  is_active: true,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export default function CategoryFormModal({ category, categories, onClose }: CategoryFormModalProps) {
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description ?? '',
        image_url: category.image_url ?? '',
        parent_id: category.parent_id ?? '',
        display_order: category.display_order?.toString() ?? '0',
        is_active: category.is_active,
      });
      setSlugTouched(true);
    } else {
      setFormData({ ...defaultFormState });
      setSlugTouched(false);
    }
  }, [category]);

  useEffect(() => {
    if (!slugTouched) {
      const nextSlug = slugify(formData.name);
      setFormData((prev) => (prev.slug === nextSlug ? prev : { ...prev, slug: nextSlug }));
    }
  }, [formData.name, slugTouched]);

  const availableParents = useMemo(
    () => categories.filter((cat) => !category || cat.id !== category.id),
    [categories, category]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      slug: (formData.slug || slugify(formData.name)).trim(),
      description: formData.description.trim(),
      image_url: formData.image_url.trim() || null,
      parent_id: formData.parent_id || null,
      display_order: Number.parseInt(formData.display_order, 10) || 0,
      is_active: formData.is_active,
    };

    const query = category
      ? supabase.from('categories').update(payload).eq('id', category.id)
      : supabase.from('categories').insert(payload);

    const { error: supabaseError } = await query;

    if (supabaseError) {
      setError(supabaseError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
  };

  const labelClass = 'mb-2 block text-sm font-medium text-slate-700 dark:text-neutral-300';
  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-neutral-700 px-4 py-2 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:border-slate-900 dark:focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-neutral-300/30';
  const checkboxClass =
    'h-5 w-5 rounded border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:ring-slate-900 dark:focus:ring-neutral-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl dark:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.8)] transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {category ? 'Edit Category' : 'Add Category'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              Organise your catalog with clear names and optional imagery.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 dark:text-neutral-400 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>
                Name *
              </label>
              <input
                value={formData.name}
                onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            required
            className={inputClass}
            placeholder="e.g. Home Audio"
          />
            </div>

            <div>
              <label className={labelClass}>
                Slug *
              </label>
              <input
                value={formData.slug}
                onChange={(event) => {
                  setSlugTouched(true);
              setFormData((prev) => ({
                ...prev,
                slug: event.target.value,
              }));
            }}
            required
            className={inputClass}
            placeholder="home-audio"
          />
            </div>

            <div>
              <label className={labelClass}>
                Display order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                display_order: event.target.value,
              }))
            }
            className={inputClass}
            placeholder="0"
          />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Description
            </label>
          <textarea
            value={formData.description}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            rows={3}
            className={inputClass}
            placeholder="Optional details shown on collection pages"
          />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Parent category
              </label>
              <select
                value={formData.parent_id}
                onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                parent_id: event.target.value,
              }))
            }
            className={inputClass}
          >
                <option value="">No parent</option>
                {availableParents.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Image URL
              </label>
              <input
                value={formData.image_url}
                onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                image_url: event.target.value,
              }))
            }
            className={inputClass}
            placeholder="https://"
          />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 px-4 py-3 transition-colors">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Visibility</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Control whether this category is available in the storefront.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Active</span>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: event.target.checked,
                  }))
                }
                className={checkboxClass}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-neutral-200 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-800 dark:hover:bg-neutral-200 disabled:opacity-70"
            >
              {loading ? 'Saving…' : category ? 'Update category' : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
