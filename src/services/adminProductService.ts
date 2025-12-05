const ENDPOINT = '/api/admin/product';

async function request<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error ?? 'Request failed');
  }

  return result?.data as T;
}

export interface AdminProductInput {
  title: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  cost_per_item: number | null;
  sku: string | null;
  category_id: string | null;
  category_slug?: string | null;
  category_name?: string | null;
  image_url: string;
  inventory_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  is_featured: boolean;
  tags: string[];
}

export interface AdminProduct extends AdminProductInput {
  id: string;
  created_at: string;
}

export const adminProductService = {
  async list(): Promise<AdminProduct[]> {
    return request<AdminProduct[]>('list');
  },

  async create(product: AdminProductInput): Promise<AdminProduct> {
    return request<AdminProduct>('create', { product });
  },

  async update(id: string, updates: Partial<AdminProductInput>): Promise<AdminProduct> {
    return request<AdminProduct>('update', { id, updates });
  },

  async remove(id: string): Promise<void> {
    await request<null>('delete', { id });
  },
};
