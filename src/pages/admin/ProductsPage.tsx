'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Package,
  ChevronDown,
  Upload,
  Download
} from 'lucide-react';
import ProductFormModal from '../../components/admin/ProductFormModal';
import { adminProductService, type AdminProductInput } from '../../services/adminProductService';
import { supabase } from '../../lib/supabase';
import { formatINR } from '../../lib/currency';

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
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const hasCategoryData = (record: Record<string, string | undefined>) => {
  return Boolean(
    (record.category_id ?? '').trim().length ||
      (record.category_slug ?? '').trim().length ||
      (record.category_name ?? '').trim().length
  );
};

const cleanCsvValue = (value: string | undefined) => {
  if (value === undefined || value === null) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    const unwrapped = trimmed.slice(1, -1);
    return unwrapped.replace(/""/g, '"').trim();
  }
  return trimmed.replace(/""/g, '"');
};

const SAMPLE_PRODUCT_CSV = `title,description,price,compare_at_price,cost_per_item,sku,category_slug,image_url,inventory_quantity,track_inventory,is_active,is_featured,tags
Wireless Earbuds,Compact wireless earbuds with charging case,2499,2999,1500,EARBUDS-001,audio-accessories,https://example.com/earbuds.jpg,120,true,true,true,audio;wireless
Yoga Mat,Non-slip yoga mat for daily workouts,1299,,650,YOGA-002,fitness-gear,https://example.com/yoga-mat.jpg,80,true,true,false,fitness;essentials
`;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [actionError, setActionError] = useState('');
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inventoryFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!bulkMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBulkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bulkMenuOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await adminProductService.list();
      setProducts(data as Product[]);
      setActionError('');
    } catch (err) {
      console.error('Error fetching products', err);
      setActionError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name');

    if (data) {
      setCategories(data as Category[]);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await adminProductService.update(product.id, { is_active: !product.is_active });
      setActionError('');
      fetchProducts();
    } catch (err) {
      console.error('Error toggling product status', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await adminProductService.remove(productId);
      setActionError('');
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleFormClose = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    fetchProducts();
    fetchCategories();
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const downloadSampleCsv = () => {
    downloadCsv(SAMPLE_PRODUCT_CSV, 'sample-products.csv');
  };

  const handleInventoryCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkMenuOpen(false);
    await importInventoryFromCsv(file);
  };

  const handleImportInventoryClick = () => {
    setBulkMenuOpen(false);
    inventoryFileInputRef.current?.click();
  };

  const handleExportProducts = () => {
    if (products.length === 0) {
      setActionError('No products available to export.');
      return;
    }

    setActionError('');

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const headers = [
      'id',
      'title',
      'description',
      'price',
      'compare_at_price',
      'cost_per_item',
      'sku',
      'category_id',
      'category_slug',
      'category_name',
      'image_url',
      'inventory_quantity',
      'track_inventory',
      'is_active',
      'is_featured',
      'tags',
      'created_at',
    ];

    const csvRows = [
      headers.join(','),
      ...products.map((product) => {
        const category = product.category_id ? categoryMap.get(product.category_id) : undefined;
        const values = [
          product.id,
          product.title,
          product.description,
          product.price,
          product.compare_at_price ?? '',
          product.cost_per_item ?? '',
          product.sku ?? '',
          product.category_id ?? '',
          category?.slug ?? '',
          category?.name ?? '',
          product.image_url,
          product.inventory_quantity,
          product.track_inventory,
          product.is_active,
          product.is_featured,
          (product.tags || []).join(';'),
          product.created_at,
        ];
        return values.map(escapeCsvValue).join(',');
      }),
    ].join('\n');

    downloadCsv(csvRows, 'products-export.csv');
  };

  const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
    if (value === undefined || value === '') {
      return defaultValue;
    }
    const normalised = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalised);
  };

  const resolveCategoryFields = (
    record: Record<string, string | undefined>,
    includeEmptyFallback: boolean
  ):
    | { category_id?: string | null; category_slug?: string | null; category_name?: string | null }
    | undefined => {
    const rawId = (record.category_id ?? '').trim();
    if (rawId) {
      return { category_id: rawId };
    }

    const slug = slugify(record.category_slug ?? '');
    const name = (record.category_name ?? '').trim();

    if (slug) {
      const match = categories.find(
        (category) => category.slug.toLowerCase() === slug.toLowerCase()
      );
      if (match) {
        return { category_id: match.id };
      }
      return {
        category_id: null,
        category_slug: slug,
        category_name: name || null,
      };
    }

    if (name) {
      const match = categories.find(
        (category) => category.name.toLowerCase() === name.toLowerCase()
      );
      if (match) {
        return { category_id: match.id };
      }
      return {
        category_id: null,
        category_name: name,
      };
    }

    if (includeEmptyFallback) {
      return { category_id: null };
    }

    return undefined;
  };

  const importProductsFromCsv = async (file: File) => {
    try {
      setActionError('');
      setLoading(true);
      const csvText = await file.text();
      const rows = csvText
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter((row) => row.length > 0);

      if (rows.length < 2) {
        throw new Error('CSV must include at least one product row.');
      }

      const headers = rows[0].split(',').map((header) => cleanCsvValue(header));
      const requiredHeaders = ['title', 'price', 'description', 'image_url', 'inventory_quantity'];
      const missing = requiredHeaders.filter((header) => !headers.includes(header));

      if (missing.length) {
        throw new Error(`Missing required columns: ${missing.join(', ')}`);
      }

      const validationErrors: string[] = [];
      const productsToCreate = rows.slice(1).map((line, lineIndex) => {
        const rowNumber = lineIndex + 2; // account for header row
        const values = line.split(',').map((value) => cleanCsvValue(value));
        const record: Record<string, string | undefined> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] ?? '';
        });

        const price = Number(record.price);
        const compareAtPrice = record.compare_at_price ? Number(record.compare_at_price) : null;
        const costPerItem = record.cost_per_item ? Number(record.cost_per_item) : null;
        const inventoryQuantity = record.inventory_quantity ? Number(record.inventory_quantity) : 0;
        const tags = (record.tags || '')
          .split(/[\|;,]/)
          .map((tag) => tag.trim())
          .filter(Boolean);
        const categoryFields = resolveCategoryFields(record, true);
        const imageUrl = record.image_url ?? '';

        if (!record.title) {
          validationErrors.push(`Row ${rowNumber}: title is required.`);
        }
        if (!imageUrl) {
          validationErrors.push(`Row ${rowNumber}: image_url is required.`);
        } else if (!/^https?:\/\/.+/i.test(imageUrl)) {
          validationErrors.push(`Row ${rowNumber}: image_url must be a valid URL.`);
        }
        if (Number.isNaN(price) || price < 0) {
          validationErrors.push(`Row ${rowNumber}: price must be a non-negative number.`);
        }
        if (compareAtPrice !== null && Number.isNaN(compareAtPrice)) {
          validationErrors.push(`Row ${rowNumber}: compare_at_price must be a number.`);
        }
        if (costPerItem !== null && Number.isNaN(costPerItem)) {
          validationErrors.push(`Row ${rowNumber}: cost_per_item must be a number.`);
        }
        if (Number.isNaN(inventoryQuantity) || inventoryQuantity < 0) {
          validationErrors.push(`Row ${rowNumber}: inventory_quantity must be zero or a positive number.`);
        }

        return {
          title: record.title ?? '',
          description: record.description ?? '',
          price,
          compare_at_price: compareAtPrice,
          cost_per_item: costPerItem,
          sku: record.sku || null,
          category_id: categoryFields?.category_id ?? null,
          category_slug: categoryFields?.category_slug ?? undefined,
          category_name: categoryFields?.category_name ?? undefined,
          image_url: imageUrl,
          inventory_quantity: inventoryQuantity,
          track_inventory: parseBoolean(record.track_inventory, true),
          is_active: parseBoolean(record.is_active, true),
          is_featured: parseBoolean(record.is_featured, false),
          tags,
        };
      }).filter((product) => product.title && product.image_url);

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.slice(0, 10).join(' '));
      }

      if (productsToCreate.length === 0) {
        throw new Error('No valid product rows detected in the CSV.');
      }

      for (const productPayload of productsToCreate) {
        await adminProductService.create(productPayload);
      }

      await Promise.all([fetchProducts(), fetchCategories()]);
    } catch (error) {
      console.error('CSV import failed', error);
      setActionError(error instanceof Error ? error.message : 'Failed to import products');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importInventoryFromCsv = async (file: File) => {
    try {
      setActionError('');
      setLoading(true);
      const csvText = await file.text();
      const rows = csvText
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter((row) => row.length > 0);

      if (rows.length < 2) {
        throw new Error('Inventory CSV must include at least one data row.');
      }

      const headers = rows[0].split(',').map((header) => cleanCsvValue(header));
      if (!headers.includes('id') && !headers.includes('sku')) {
        throw new Error('Inventory CSV must include either an "id" or "sku" column.');
      }

      const byId = new Map(products.map((product) => [product.id, product]));
      const bySku = new Map(
        products
          .filter((product) => product.sku)
          .map((product) => [product.sku!.toLowerCase(), product])
      );

      const validationErrors: string[] = [];

      const updates = rows.slice(1).map((line, lineIndex) => {
        const rowNumber = lineIndex + 2;
        const values = line.split(',').map((value) => cleanCsvValue(value));
        const record: Record<string, string | undefined> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] ?? '';
        });

        const rawId = (record.id ?? '').trim();
        const rawSku = (record.sku ?? '').trim().toLowerCase();

        let productId: string | null = null;
        if (rawId && byId.has(rawId)) {
          productId = rawId;
        } else if (rawSku && bySku.has(rawSku)) {
          productId = bySku.get(rawSku)!.id;
        } else {
          validationErrors.push(
            `Row ${rowNumber}: unable to match product using id "${rawId}" or sku "${record.sku}".`
          );
        }

        const parsedUpdates: Partial<AdminProductInput> = {};

        if (headers.includes('title') && record.title && record.title.trim().length > 0) {
          parsedUpdates.title = record.title;
        }

        if (headers.includes('description') && record.description && record.description.length > 0) {
          parsedUpdates.description = record.description;
        }

        if (headers.includes('image_url') && record.image_url && record.image_url.trim().length > 0) {
          if (!/^https?:\/\/.+/i.test(record.image_url)) {
            validationErrors.push(`Row ${rowNumber}: image_url must be a valid URL.`);
          } else {
            parsedUpdates.image_url = record.image_url;
          }
        }

        const numericFields: Array<{ key: keyof AdminProductInput; source: string; allowNull?: boolean }> = [
          { key: 'price', source: 'price' },
          { key: 'compare_at_price', source: 'compare_at_price', allowNull: true },
          { key: 'cost_per_item', source: 'cost_per_item', allowNull: true },
        ];

        numericFields.forEach(({ key, source, allowNull }) => {
          if (!headers.includes(source)) return;
          const raw = record[source];
          if (raw === undefined || raw === '') return;
          const parsed = Number(raw);
          if (Number.isNaN(parsed)) {
            validationErrors.push(`Row ${rowNumber}: ${source} must be a number.`);
          } else if (!allowNull && parsed < 0) {
            validationErrors.push(`Row ${rowNumber}: ${source} must be zero or positive.`);
          } else {
            (parsedUpdates as any)[key] = parsed;
          }
        });

        if (headers.includes('inventory_quantity')) {
          const rawInventory = record.inventory_quantity;
          if (rawInventory !== undefined && rawInventory !== '') {
            const inventory = Number(rawInventory);
            if (Number.isNaN(inventory) || inventory < 0) {
              validationErrors.push(
                `Row ${rowNumber}: inventory_quantity must be zero or a positive number.`
              );
            } else {
              parsedUpdates.inventory_quantity = inventory;
            }
          }
        }

        if (headers.includes('track_inventory') && record.track_inventory && record.track_inventory !== '') {
          parsedUpdates.track_inventory = parseBoolean(record.track_inventory, true);
        }

        if (headers.includes('is_active') && record.is_active && record.is_active !== '') {
          parsedUpdates.is_active = parseBoolean(record.is_active, true);
        }

        if (headers.includes('is_featured') && record.is_featured && record.is_featured !== '') {
          parsedUpdates.is_featured = parseBoolean(record.is_featured, false);
        }

        if (headers.includes('sku') && record.sku && record.sku !== '') {
          parsedUpdates.sku = record.sku || null;
        }

        if (headers.includes('tags') && record.tags !== undefined) {
          parsedUpdates.tags = (record.tags || '')
            .split(/[\|;,]/)
            .map((tag) => tag.trim())
            .filter(Boolean);
        }

        if (hasCategoryData(record)) {
          const categoryFields = resolveCategoryFields(record, false);
          if (categoryFields) {
            if (categoryFields.category_id !== undefined) {
              parsedUpdates.category_id = categoryFields.category_id ?? null;
            }
            if (categoryFields.category_slug !== undefined) {
              parsedUpdates.category_slug = categoryFields.category_slug ?? null;
            }
            if (categoryFields.category_name !== undefined) {
              parsedUpdates.category_name = categoryFields.category_name ?? null;
            }
          }
        }

        return {
          productId,
          updates: parsedUpdates,
        };
      });

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.slice(0, 10).join(' '));
      }

      for (const entry of updates) {
        if (!entry.productId) continue;
        const updatePayload = entry.updates;
        if (Object.keys(updatePayload).length === 0) continue;
        await adminProductService.update(entry.productId, updatePayload);
      }

      await Promise.all([fetchProducts(), fetchCategories()]);
    } catch (error) {
      console.error('Inventory import failed', error);
      setActionError(error instanceof Error ? error.message : 'Failed to import inventory CSV');
    } finally {
      setLoading(false);
      if (inventoryFileInputRef.current) {
        inventoryFileInputRef.current.value = '';
      }
    }
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkMenuOpen(false);
    await importProductsFromCsv(file);
  };

  const handleUploadCsvClick = () => {
    setBulkMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleDownloadSampleCsv = () => {
    setBulkMenuOpen(false);
    downloadSampleCsv();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && product.is_active) ||
                         (filterStatus === 'inactive' && !product.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="text-slate-600 dark:text-neutral-400 mt-1">{products.length} total products</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowProductForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-neutral-100 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
          >
            <Plus size={20} />
            Add Product
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setBulkMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={bulkMenuOpen}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-sm font-medium"
            >
              <ChevronDown size={18} />
              Bulk import
            </button>
            {bulkMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg py-2 z-20"
                role="menu"
              >
                <button
                  onClick={handleUploadCsvClick}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  role="menuitem"
                >
                  <Upload size={16} />
                  Upload product CSV
                </button>
                <button
                  onClick={handleImportInventoryClick}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  role="menuitem"
                >
                  <Upload size={16} />
                  Import inventory CSV
                </button>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  role="menuitem"
                >
                  <Download size={16} />
                  Download sample CSV
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <input
              ref={inventoryFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleInventoryCsvFileChange}
              className="hidden"
            />
          </div>
        </div>
        <button
          onClick={handleExportProducts}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Inventory Snapshot (.csv)
        </button>
      </div>

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg">
          {actionError}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-neutral-300"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-slate-900 dark:border-neutral-700 dark:border-t-neutral-100"></div>
          <p className="text-slate-600 dark:text-neutral-400 mt-4">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Package size={48} className="mx-auto text-slate-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No products found</h3>
          <p className="text-slate-600 dark:text-neutral-400 mb-6">Get started by creating your first product</p>
          <button
            onClick={() => setShowProductForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-slate-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-slate-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{product.title}</p>
                          {product.is_featured && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-xs font-medium rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-neutral-400">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{formatINR(product.price)}</p>
                        {product.compare_at_price && (
                          <p className="text-xs text-slate-500 dark:text-neutral-400 line-through">
                            {formatINR(product.compare_at_price)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.inventory_quantity > 10
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                          : product.inventory_quantity > 0
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                      }`}>
                        {product.inventory_quantity} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                          : 'bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                          title={product.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {product.is_active ? (
                            <EyeOff size={18} className="text-slate-600 dark:text-neutral-300" />
                          ) : (
                            <Eye size={18} className="text-slate-600 dark:text-neutral-300" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} className="text-slate-600 dark:text-neutral-300" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600 dark:text-red-400" />
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

      {showProductForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
