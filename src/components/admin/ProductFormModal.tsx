import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { adminProductService } from '../../services/adminProductService';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  cost_per_item: number | null;
  sku: string | null;
  category_id: string | null;
  image_url: string;
  inventory_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  is_featured: boolean;
  tags: string[] | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}

export default function ProductFormModal({ product, categories, onClose }: ProductFormModalProps) {
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    compare_at_price: '',
    cost_per_item: '',
    sku: '',
    category_id: '',
    image_url: '',
    inventory_quantity: '0',
    track_inventory: true,
    is_active: true,
    is_featured: false,
    tags: '',
  });
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        description: product.description,
        price: product.price.toString(),
        compare_at_price: product.compare_at_price?.toString() || '',
        cost_per_item: product.cost_per_item?.toString() || '',
        sku: product.sku || '',
        category_id: product.category_id || '',
        image_url: product.image_url,
        inventory_quantity: product.inventory_quantity.toString(),
        track_inventory: product.track_inventory,
        is_active: product.is_active,
        is_featured: product.is_featured,
        tags: (product.tags || []).join(', '),
      });
      if (product.category_id) {
        setCategoryMode('existing');
        setNewCategoryName('');
      } else {
        setCategoryMode('existing');
        setNewCategoryName('');
      }
    } else {
      setCategoryMode('existing');
      setNewCategoryName('');
      setFormData({
        title: '',
        description: '',
        price: '',
        compare_at_price: '',
        cost_per_item: '',
        sku: '',
        category_id: '',
        image_url: '',
        inventory_quantity: '0',
        track_inventory: true,
        is_active: true,
        is_featured: false,
        tags: '',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedCategoryName = newCategoryName.trim();
    let categoryPayload:
      | { category_id: string | null; category_name?: string; category_slug?: string }
      | undefined;

    if (categoryMode === 'new') {
      if (!trimmedCategoryName) {
        setError('Please provide a category name.');
        setLoading(false);
        return;
      }
      const slug = slugify(trimmedCategoryName);
      if (!slug) {
        setError('Category name must include letters or numbers.');
        setLoading(false);
        return;
      }
      categoryPayload = {
        category_id: null,
        category_name: trimmedCategoryName,
        category_slug: slug,
      };
    } else {
      categoryPayload = {
        category_id: formData.category_id || null,
      };
    }

    const productData = {
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price),
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      cost_per_item: formData.cost_per_item ? parseFloat(formData.cost_per_item) : null,
      sku: formData.sku || null,
      image_url: formData.image_url,
      inventory_quantity: parseInt(formData.inventory_quantity),
      track_inventory: formData.track_inventory,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      ...categoryPayload,
    };

    try {
      if (product) {
        await adminProductService.update(product.id, productData);
      } else {
        await adminProductService.create(productData);
      }

      setLoading(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
      setLoading(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2';
  const inputClass =
    'w-full px-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300';
  const checkboxClass =
    'w-4 h-4 rounded border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:ring-slate-900 dark:focus:ring-neutral-300';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-2xl dark:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-neutral-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-600 dark:text-neutral-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className={labelClass}>
                Product Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className={inputClass}
                placeholder="e.g., Wireless Headphones"
              />
            </div>

            <div>
              <label className={labelClass}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={inputClass}
                placeholder="Product description..."
              />
            </div>
            <div>
              <label className={labelClass}>
                Tags
                <span className="text-xs font-normal text-slate-500 dark:text-neutral-400 ml-1">
                  (comma separated)
                </span>
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className={inputClass}
                placeholder="e.g., accessories, audio, gadgets"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Compare at Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.compare_at_price}
                  onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Cost per Item
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_per_item}
                  onChange={(e) => setFormData({ ...formData, cost_per_item: e.target.value })}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={inputClass}
                  placeholder="PROD-001"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Category
                </label>
                <select
                  value={categoryMode === 'existing' ? formData.category_id : '__new__'}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setCategoryMode('new');
                      setFormData({ ...formData, category_id: '' });
                    } else {
                      setCategoryMode('existing');
                      setFormData({ ...formData, category_id: e.target.value });
                      setNewCategoryName('');
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">No Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  <option value="__new__">+ Create new category</option>
                </select>
                {categoryMode === 'new' && (
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className={`${inputClass} mt-3`}
                    placeholder="New category name"
                  />
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Image URL *
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                required
                className={inputClass}
                placeholder="https://example.com/image.jpg"
              />
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-neutral-700"
                />
              )}
            </div>

            <div>
              <label className={labelClass}>
                Inventory Quantity
              </label>
              <input
                type="number"
                value={formData.inventory_quantity}
                onChange={(e) => setFormData({ ...formData, inventory_quantity: e.target.value })}
                className={inputClass}
                placeholder="0"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.track_inventory}
                  onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                  className={checkboxClass}
                />
                <span className="text-sm text-slate-700 dark:text-neutral-300">Track inventory</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className={checkboxClass}
                />
                <span className="text-sm text-slate-700 dark:text-neutral-300">Product is active</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className={checkboxClass}
                />
                <span className="text-sm text-slate-700 dark:text-neutral-300">Featured product</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-slate-800 dark:hover:bg-neutral-200 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
