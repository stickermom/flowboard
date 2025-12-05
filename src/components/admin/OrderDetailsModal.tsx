import { X, Package, User, Calendar, DollarSign } from 'lucide-react';
import { formatINR } from '../../lib/currency';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  items: any[];
  created_at: string;
}

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl dark:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-neutral-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Order Details</h2>
            <p className="text-slate-600 dark:text-neutral-400 text-sm mt-1">{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-600 dark:text-neutral-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-neutral-900 rounded-lg p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-slate-600 dark:text-neutral-400" />
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-medium">Order Date</p>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-900 rounded-lg p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-slate-600 dark:text-neutral-400" />
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-medium">Payment Status</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                order.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                  : order.payment_status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300'
              }`}>
                {order.payment_status || 'Pending'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-900 rounded-lg p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-slate-600 dark:text-neutral-400" />
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-medium">Fulfillment</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                order.fulfillment_status === 'fulfilled'
                  ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                  : order.fulfillment_status === 'shipped'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-300'
              }`}>
                {order.fulfillment_status || 'Unfulfilled'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <User size={20} className="text-slate-600 dark:text-neutral-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Customer Information</h3>
            </div>
            <div className="bg-slate-50 dark:bg-neutral-900 rounded-lg p-4 space-y-2 transition-colors">
              <div>
                <p className="text-xs text-slate-600 dark:text-neutral-400">Email</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{order.customer_email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-neutral-400">Customer ID</p>
                <p className="text-sm font-mono text-slate-900 dark:text-white">{order.user_id}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={20} className="text-slate-600 dark:text-neutral-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Order Items</h3>
            </div>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-neutral-900 rounded-lg p-4 transition-colors">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.title}
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-neutral-700"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{item.product.title}</p>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">Quantity: {item.quantity}</p>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">{formatINR(item.product.price)} each</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatINR(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-neutral-800 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-neutral-400">Subtotal</span>
                <span className="text-slate-900 dark:text-white font-medium">{formatINR(order.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-neutral-400">Shipping</span>
                <span className="text-slate-900 dark:text-white font-medium">{formatINR(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-neutral-400">Tax</span>
                <span className="text-slate-900 dark:text-white font-medium">{formatINR(0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-neutral-800">
                <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                <span className="font-bold text-slate-900 dark:text-white text-lg">{formatINR(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-slate-800 dark:hover:bg-neutral-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
