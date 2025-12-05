import { supabase } from '../lib/supabase';

/**
 * Migrates guest user data (cart, favorites, orders) to authenticated user
 * This is called when a user signs up or logs in
 */
export async function migrateGuestDataToUser(guestUserId: string, authenticatedUserId: string) {
  try {
    // Migrate cart items
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', guestUserId);

    if (cartItems && cartItems.length > 0) {
      // Check for existing items in authenticated user's cart
      for (const item of cartItems) {
        const { data: existing } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', authenticatedUserId)
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (existing) {
          // Merge quantities
          await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + item.quantity })
            .eq('id', existing.id);
          
          // Delete guest item
          await supabase
            .from('cart_items')
            .delete()
            .eq('id', item.id);
        } else {
          // Move to authenticated user
          await supabase
            .from('cart_items')
            .update({ user_id: authenticatedUserId })
            .eq('id', item.id);
        }
      }
    }

    // Migrate favorites
    const { data: favorites } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', guestUserId);

    if (favorites && favorites.length > 0) {
      for (const favorite of favorites) {
        // Check if already favorited
        const { data: existing } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', authenticatedUserId)
          .eq('product_id', favorite.product_id)
          .maybeSingle();

        if (!existing) {
          // Move to authenticated user
          await supabase
            .from('favorites')
            .update({ user_id: authenticatedUserId })
            .eq('id', favorite.id);
        } else {
          // Delete duplicate
          await supabase
            .from('favorites')
            .delete()
            .eq('id', favorite.id);
        }
      }
    }

    // Migrate orders (update user_id)
    await supabase
      .from('orders')
      .update({ user_id: authenticatedUserId })
      .eq('user_id', guestUserId);

    // Migrate addresses
    await supabase
      .from('addresses')
      .update({ user_id: authenticatedUserId })
      .eq('user_id', guestUserId);

    // Migrate preferences
    const { data: guestPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', guestUserId)
      .maybeSingle();

    if (guestPrefs) {
      const { data: authPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', authenticatedUserId)
        .maybeSingle();

      if (authPrefs) {
        // Update existing preferences (merge)
        await supabase
          .from('user_preferences')
          .update({
            email_notifications: guestPrefs.email_notifications || authPrefs.email_notifications,
            sms_notifications: guestPrefs.sms_notifications || authPrefs.sms_notifications,
            newsletter: guestPrefs.newsletter || authPrefs.newsletter,
          })
          .eq('id', authPrefs.id);
        
        // Delete guest preferences
        await supabase
          .from('user_preferences')
          .delete()
          .eq('id', guestPrefs.id);
      } else {
        // Move to authenticated user
        await supabase
          .from('user_preferences')
          .update({ user_id: authenticatedUserId })
          .eq('id', guestPrefs.id);
      }
    }

    // Clean up guest user ID from localStorage
    localStorage.removeItem('userId');

    return { success: true };
  } catch (error) {
    console.error('Error migrating guest data:', error);
    return { success: false, error };
  }
}

