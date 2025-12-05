import { useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product, UserInteraction } from '../types';
import { formatINR } from '../lib/currency';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: boolean;
  onAddToCart?: (product: Product) => void;
  cartQuantity?: number;
}

type HoverRegion = 'none' | 'top' | 'center' | 'bottom';

interface HoverPoint {
  x: number;
  y: number;
}

export default function ProductCard({
  product,
  onProductClick,
  onToggleFavorite,
  isFavorite,
  onAddToCart,
  cartQuantity = 0
}: ProductCardProps) {
  const [interaction, setInteraction] = useState<UserInteraction>({
    liked: false,
    saved: false,
    inCart: false
  });
  const [hoverRegion, setHoverRegion] = useState<HoverRegion>('none');
  const [hoverPoint, setHoverPoint] = useState<HoverPoint>({ x: 50, y: 50 });
  const isInStock = product.isInStock;
  const showOverlay = hoverRegion !== 'none';
  const highlightTop = hoverRegion === 'top';
  const highlightBottom = hoverRegion === 'bottom';
  const highlightCenter = hoverRegion === 'center';
  const cartLabel = !isInStock
    ? 'Out of stock'
    : cartQuantity > 0
    ? `${cartQuantity} in cart`
    : interaction.inCart
    ? 'Added to cart'
    : 'Add to cart';
  const favoriteLabel = isFavorite ? 'In favorites' : 'Add to favorites';
  const hasCartPill = cartQuantity > 0;
  const showCartPill = hasCartPill && !showOverlay;
  const hasOutOfStockBadge = !isInStock;
  const showOutOfStockBadge = hasOutOfStockBadge && !showOverlay;
  const topButtonClasses = [
    'flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-opacity duration-200',
    highlightTop ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]' : 'text-white/70',
    onAddToCart && isInStock
      ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
      : 'opacity-60 cursor-not-allowed'
  ].join(' ');
  const bottomButtonClasses = [
    'flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-opacity duration-200',
    highlightBottom ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]' : isFavorite ? 'text-white' : 'text-white/70',
    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
  ].join(' ');
  const overlayStyle = showOverlay
    ? {
        background: `radial-gradient(circle at ${hoverPoint.x}% ${hoverPoint.y}%, rgba(255,255,255,0.04), rgba(15,23,42,0.9))`
      }
    : undefined;
  const priceClasses = [
    'text-2xl font-semibold text-center transition-colors duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
    highlightCenter ? 'text-white' : 'text-white/80'
  ].join(' ');
  const cartPillVisibility = showCartPill ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none';
  const stockBadgeVisibility = showOutOfStockBadge ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none';

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart && isInStock) {
      onAddToCart(product);
      setInteraction(prev => ({ ...prev, inCart: true }));
    }
  };

  const handleHoverMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const offsetX = e.clientX - rect.left;
    const height = rect.height;
    const width = rect.width;
    const nextPoint = {
      x: Math.min(100, Math.max(0, (offsetX / width) * 100)),
      y: Math.min(100, Math.max(0, (offsetY / height) * 100))
    };

    let nextRegion: HoverRegion;
    if (offsetY < height * 0.35) {
      nextRegion = 'top';
    } else if (offsetY > height * 0.65) {
      nextRegion = 'bottom';
    } else {
      nextRegion = 'center';
    }

    setHoverPoint(prev => (prev.x === nextPoint.x && prev.y === nextPoint.y ? prev : nextPoint));

    setHoverRegion(prev => (prev === nextRegion ? prev : nextRegion));
  };

  const handleMouseLeave = () => {
    setHoverRegion('none');
    setHoverPoint({ x: 50, y: 50 });
  };

  return (
    <div
      className="cursor-pointer break-inside-avoid mb-3"
      onClick={() => onProductClick(product)}
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-200">
        <div
          className="relative overflow-hidden bg-white"
          onMouseEnter={handleHoverMove}
          onMouseMove={handleHoverMove}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={product.imageUrl}
            alt={product.title}
            className={`w-full h-auto object-cover ${!isInStock ? 'opacity-80' : ''}`}
            loading="lazy"
          />

          {hasCartPill && (
            <div
              className={`absolute top-3 left-3 z-10 bg-white/85 text-slate-900 text-xs font-semibold px-2 py-1 rounded-full shadow-sm transition-all duration-200 ${cartPillVisibility}`}
            >
              {cartQuantity} in cart
            </div>
          )}

          <div
            className={`absolute inset-0 transition-opacity duration-200 pointer-events-none backdrop-blur-md ${
              showOverlay ? 'opacity-100' : 'opacity-0'
            }`}
            style={overlayStyle}
          />

          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${showOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!onAddToCart || !isInStock}
              className={topButtonClasses}
              aria-label="Add product to cart"
            >
              <ShoppingCart size={16} />
              {cartLabel}
            </button>
            <div className="flex-1 flex items-center justify-center pointer-events-none px-4">
              <p className={priceClasses}>
                {formatINR(product.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLike}
              className={bottomButtonClasses}
              aria-label="Toggle favorite"
              aria-pressed={isFavorite}
            >
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} className="transition-colors" />
              {favoriteLabel}
            </button>
          </div>
          {hasOutOfStockBadge && (
            <div
              className={`absolute bottom-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow transition-all duration-200 ${stockBadgeVisibility}`}
            >
              Out of stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
