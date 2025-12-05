import { useState } from 'react';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { CartItem } from '../types';
import { supabase } from '../lib/supabase';
import { formatINR } from '../lib/currency';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  userId: string;
  onCheckoutSuccess: () => void;
}

export default function CartModal({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  userId,
  onCheckoutSuccess,
}: CartModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    setIsProcessing(true);
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        items: cartItems,
        total: total,
        status: 'completed',
      });

    setIsProcessing(false);

    if (!error) {
      onCheckoutSuccess();
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-zinc-900 shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-zinc-800 border-b border-zinc-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-700 rounded-full transition-colors text-zinc-300"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-400">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-sm mb-1 truncate">
                        {item.product.title}
                      </h3>
                      <p className="text-zinc-400 text-xs mb-2">
                        {formatINR(item.product.price)}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              Math.max(0, item.quantity - 1)
                            )
                          }
                          className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors text-zinc-300"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-white text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors text-zinc-300"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="ml-auto p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-700 flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Subtotal</span>
                    <span className="text-white font-semibold">
                      {formatINR(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="bg-zinc-800 border-t border-zinc-700 px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-white">Total</span>
              <span className="text-2xl font-bold text-white">
                {formatINR(total)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full py-3 px-6 rounded-lg font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
