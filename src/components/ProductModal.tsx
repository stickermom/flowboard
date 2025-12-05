import { X, Heart, Bookmark, ShoppingCart, Plus } from 'lucide-react';
import { useState } from 'react';
import { Product, UserInteraction } from '../types';
import { formatINR } from '../lib/currency';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: boolean;
  cartQuantity?: number;
}

export default function ProductModal({ product, onClose, onAddToCart, onToggleFavorite, isFavorite, cartQuantity = 0 }: ProductModalProps) {
  const [interaction, setInteraction] = useState<UserInteraction>({
    liked: false,
    saved: false,
    inCart: false
  });
  const isInStock = product.isInStock;

  const handleLike = () => {
    onToggleFavorite(product);
  };

  const handleSave = () => {
    setInteraction(prev => ({ ...prev, saved: !prev.saved }));
  };

  const handleAddToCart = () => {
    if (!isInStock) {
      return;
    }
    setInteraction(prev => ({ ...prev, inCart: true }));
    onAddToCart(product);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2.5 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full transition-all shadow-sm hover:shadow-md"
          aria-label="Close modal"
        >
          <X size={20} className="text-slate-700" />
        </button>

        <div className="grid md:grid-cols-[1.2fr,1fr] overflow-y-auto max-h-[92vh]">
          <div className="relative bg-slate-50/50 p-8 flex items-center justify-center">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-auto rounded-2xl shadow-lg"
            />
          </div>

          <div className="flex flex-col p-8 md:p-10">
            <div className="mb-6">
              <span className="inline-block px-3 py-1.5 bg-slate-100/80 backdrop-blur-sm rounded-full text-xs font-medium text-slate-600 mb-4">
                {product.category}
              </span>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-3 leading-tight">
                {product.title}
              </h2>
              <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                {formatINR(product.price)}
              </p>
              <p className="text-slate-600 leading-relaxed text-[15px]">
                {product.description}
              </p>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all ${
                  isFavorite
                    ? 'bg-red-50 text-red-600'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <Heart
                  size={18}
                  fill={isFavorite ? 'currentColor' : 'none'}
                />
                <span className="text-sm font-medium">{isFavorite ? 'Liked' : 'Like'}</span>
              </button>

              <button
                onClick={handleAddToCart}
                disabled={!isInStock}
                className={`relative px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all ${
                  isInStock
                    ? 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                    : 'bg-slate-100/60 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart size={18} />
                {isInStock && (
                  <>
                    {cartQuantity > 0 ? (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                        {cartQuantity > 99 ? '99+' : cartQuantity}
                      </span>
                    ) : (
                      <Plus size={12} className="absolute -top-1 -right-1 bg-slate-900 text-white rounded-full p-0.5" />
                    )}
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 mb-8">
              <button
                disabled={!isInStock}
                className={`w-full py-4 px-6 rounded-xl font-semibold backdrop-blur-sm border transition-all shadow-sm ${
                  isInStock
                    ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-md'
                    : 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Buy Now
              </button>
            </div>

            <div className="pt-6 border-t border-slate-200/60">
              <ul className="space-y-3 text-[15px]">
                <li className="flex justify-between text-slate-600">
                  <span>Category</span>
                  <span className="text-slate-900 font-medium">{product.category}</span>
                </li>
                <li className="flex justify-between text-slate-600">
                  <span>Availability</span>
                  <span
                    className={`font-medium ${
                      isInStock ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {isInStock ? 'In Stock' : 'Out of stock'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
