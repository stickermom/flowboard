
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatINR } from '../lib/currency';
import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  userId: string;
  onCheckoutSuccess: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
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
  const { isAuthenticated, signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      alert('Please login to proceed with payment');
      // Optional: Trigger login flow here if desired, e.g. open login modal or redirect
      // For now, just alerting as requested.
      return;
    }

    setIsProcessing(true);

    try {
      const res = await loadRazorpayScript();

      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        setIsProcessing(false);
        return;
      }

      // 1. Create Pending Order in Supabase
      const orderNumber = `ORD - ${Date.now()} -${Math.random().toString(36).substr(2, 6).toUpperCase()} `;

      const { data: orderDataDb, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          order_number: orderNumber,
          items: cartItems,
          total: total,
          status: 'pending', // Initial status
        })
        .select()
        .single();

      if (orderError || !orderDataDb) {
        throw new Error('Failed to create pending order');
      }

      console.log('Pending order created:', orderDataDb.id);

      // 2. Subscribe to Realtime Updates for this Booking
      const channel = supabase
        .channel(`order_updates_${orderDataDb.id} `)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id = eq.${orderDataDb.id} `,
          },
          (payload: any) => {
            console.log('Realtime update received:', payload);
            console.log('New Status:', payload.new?.status);

            if (payload.new?.status === 'paid') {
              console.log('Payment Confirmed! Closing modal.');
              // Payment confirmed by Server (via Webhook)
              setIsProcessing(false);
              onCheckoutSuccess();
              onClose();
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      // 3. Create Order on Razorpay Backend (passing internal order ID)
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          currency: 'INR',
          notes: {
            flowboard_order_id: orderDataDb.id, // Critical for Webhook matching
          },
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const razorpayOrderData = await orderRes.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrderData.amount,
        currency: razorpayOrderData.currency,
        name: "Flowboard Store",
        description: "Secure Payment",
        order_id: razorpayOrderData.id,
        handler: function (response: any) {
          // In Webhook flow, we DO NOT client-side update only.
          // We wait for the Realtime subscription to fire.
          console.log("Payment completed on client, waiting for webhook confirmation...");
          // Optionally show a "Verifying..." spinner here.
        },
        prefill: {
          name: "Flowboard User",
          email: "user@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            supabase.removeChannel(channel);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
      setIsProcessing(false);
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
              {isProcessing ? 'Processing...' : 'Pay with Razorpay'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
