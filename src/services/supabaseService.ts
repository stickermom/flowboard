import { supabase } from '../lib/supabase';
import { Product, CartItem } from '../types';

export interface DbProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: string | null;
  image_url: string;
  is_active: boolean;
  is_featured: boolean;
  track_inventory: boolean;
  inventory_quantity: number;
  tags: string[];
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
}

type ProductRow = DbProduct & {
  categories?: {
    name?: string | null;
  } | null;
};

type CartItemRow = {
  id: string;
  quantity: number;
  product_id: string;
  products: ProductRow;
};

type FavoriteRow = {
  product_id: string;
  products: ProductRow;
};

const formatTagLabel = (tag: string): string => {
  const normalised = tag.trim();
  if (!normalised) {
    return 'Uncategorized';
  }

  return normalised
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const resolveCategoryLabel = (
  categoryName: string | null | undefined,
  tags: string[] | null | undefined
): string => {
  if (categoryName) {
    return categoryName;
  }

  if (Array.isArray(tags) && tags.length > 0) {
    return formatTagLabel(tags[0]);
  }

  return 'Uncategorized';
};

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        description,
        price,
        image_url,
        tags,
        track_inventory,
        inventory_quantity,
        is_active,
        category_id,
        categories (
          name
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    const rows = (data ?? []) as ProductRow[];

    return rows.map(item => {
      const trackInventory = Boolean(item.track_inventory);
      const inventoryQuantity = Number(item.inventory_quantity ?? 0);
      const isInStock = !trackInventory || inventoryQuantity > 0;

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.image_url,
        category: resolveCategoryLabel(item.categories?.name, item.tags),
        trackInventory,
        inventoryQuantity,
        isInStock,
      };
    });
  },
};

export const cartService = {
  async getCartItems(userId: string): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        product_id,
        products (
          id,
          title,
          description,
          price,
          image_url,
          category_id,
          tags,
          track_inventory,
          inventory_quantity,
          categories (
            name
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching cart items:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    const rows = (data ?? []) as CartItemRow[];

    return rows.map(item => {
      const trackInventory = Boolean(item.products.track_inventory);
      const inventoryQuantity = Number(item.products.inventory_quantity ?? 0);

      return {
        product: {
          id: item.products.id,
          title: item.products.title,
          description: item.products.description,
          price: Number(item.products.price),
          imageUrl: item.products.image_url,
          category: resolveCategoryLabel(item.products.categories?.name, item.products.tags),
          trackInventory,
          inventoryQuantity,
          isInStock: !trackInventory || inventoryQuantity > 0,
        },
        quantity: item.quantity,
      };
    });
  },

  async addToCart(userId: string, productId: string, quantity: number = 1): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to add items to cart');
    }

    const { data: existing, error: checkError } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing cart item:', {
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
        code: checkError.code,
      });
      throw new Error(`Failed to check cart: ${checkError.message || 'Unknown error'}`);
    }

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating cart item:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Failed to update cart: ${error.message || 'Unknown error'}`);
      }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: userId, product_id: productId, quantity });

      if (error) {
        console.error('Error adding to cart:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Failed to add to cart: ${error.message || 'Unknown error'}`);
      }
    }
  },

  async updateQuantity(userId: string, productId: string, quantity: number): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to update cart');
    }

    if (quantity === 0) {
      await this.removeItem(userId, productId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error updating quantity:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to update quantity: ${error.message || 'Unknown error'}`);
    }
  },

  async removeItem(userId: string, productId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to remove items from cart');
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing cart item:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to remove item: ${error.message || 'Unknown error'}`);
    }
  },

  async clearCart(userId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to clear cart');
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing cart:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to clear cart: ${error.message || 'Unknown error'}`);
    }
  },
};

export const favoritesService = {
  async getFavorites(userId: string): Promise<Product[]> {
    if (!userId || userId.trim() === '') {
      return [];
    }

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        product_id,
        products (
          id,
          title,
          description,
          price,
          image_url,
          category_id,
          tags,
          track_inventory,
          inventory_quantity,
          categories (
            name
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      // Only log if it's not a permission error (RLS might block)
      if (error.code !== 'PGRST116' && error.message !== 'JWT expired') {
        console.error('Error fetching favorites:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }
      return [];
    }

    const rows = (data ?? []) as FavoriteRow[];

    return rows.map(item => {
      const trackInventory = Boolean(item.products.track_inventory);
      const inventoryQuantity = Number(item.products.inventory_quantity ?? 0);

      return {
        id: item.products.id,
        title: item.products.title,
        description: item.products.description,
        price: Number(item.products.price),
        imageUrl: item.products.image_url,
        category: resolveCategoryLabel(item.products.categories?.name, item.products.tags),
        trackInventory,
        inventoryQuantity,
        isInStock: !trackInventory || inventoryQuantity > 0,
      };
    });
  },

  async addFavorite(userId: string, productId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to add favorites');
    }

    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, product_id: productId });

    if (error && error.code !== '23505') {
      console.error('Error adding favorite:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to add favorite: ${error.message || 'Unknown error'}`);
    }
  },

  async removeFavorite(userId: string, productId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to remove favorites');
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing favorite:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to remove favorite: ${error.message || 'Unknown error'}`);
    }
  },

  async toggleFavorite(userId: string, productId: string): Promise<boolean> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required to toggle favorites');
    }

    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking favorite:', {
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
        code: checkError.code,
      });
      throw new Error(`Failed to check favorite: ${checkError.message || 'Unknown error'}`);
    }

    if (existing) {
      await this.removeFavorite(userId, productId);
      return false;
    } else {
      await this.addFavorite(userId, productId);
      return true;
    }
  },
};
