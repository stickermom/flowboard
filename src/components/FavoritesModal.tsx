import { X, Heart } from 'lucide-react';
import { Product } from '../types';
import { formatINR } from '../lib/currency';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Product[];
  onRemoveFavorite: (productId: string) => void;
  onProductClick: (product: Product) => void;
}

export default function FavoritesModal({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onProductClick,
}: FavoritesModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">Favorites</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-700"
            aria-label="Close favorites"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No favorites yet</p>
              <p className="text-slate-400 text-sm mt-2">
                Tap the heart icon on products to save them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    onProductClick(product);
                    onClose();
                  }}
                >
                  <div className="flex gap-4 p-4">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate">
                        {product.title}
                      </h3>
                      <p className="text-slate-500 text-xs mb-2 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-slate-900 font-bold text-lg">
                          {formatINR(product.price)}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFavorite(product.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          aria-label="Remove from favorites"
                        >
                          <Heart size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
