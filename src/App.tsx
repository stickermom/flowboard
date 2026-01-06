import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AuthModal from './components/AuthModal';
import CartModal from './components/CartModal';
import FavoritesModal from './components/FavoritesModal';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import ProfileModal from './components/ProfileModal';
import { useAuth } from './contexts/AuthContext';
import { cartService, favoritesService, productService } from './services/supabaseService';
import { migrateGuestDataToUser } from './services/userMigrationService';
import { CartItem, Product } from './types';

function App() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [headerVisible, setHeaderVisible] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Get userId: authenticated user ID or guest ID
  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
    const newId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', newId);
    return newId;
  });
  const [showLoader, setShowLoader] = useState(true);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const lastScrollY = useRef(0);

  const addToCart = async (product: Product) => {
    if (product.trackInventory && !product.isInStock) {
      window.alert('This product is currently out of stock.');
      return;
    }
    await cartService.addToCart(userId, product.id);
    const updatedCart = await cartService.getCartItems(userId);
    setCartItems(updatedCart);
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    const item = cartItems.find((cartItem) => cartItem.product.id === productId);
    if (item?.product.trackInventory && newQuantity > item.product.inventoryQuantity) {
      window.alert('Not enough inventory available for this product.');
      return;
    }
    await cartService.updateQuantity(userId, productId, newQuantity);
    const updatedCart = await cartService.getCartItems(userId);
    setCartItems(updatedCart);
  };

  const removeItem = async (productId: string) => {
    await cartService.removeItem(userId, productId);
    const updatedCart = await cartService.getCartItems(userId);
    setCartItems(updatedCart);
  };

  const addToFavorites = async (product: Product) => {
    await favoritesService.toggleFavorite(userId, product.id);
    const updatedFavorites = await favoritesService.getFavorites(userId);
    setFavorites(updatedFavorites);
  };

  const removeFavorite = async (productId: string) => {
    await favoritesService.removeFavorite(userId, productId);
    const updatedFavorites = await favoritesService.getFavorites(userId);
    setFavorites(updatedFavorites);
  };

  const isFavorite = (productId: string) => {
    return favorites.some(fav => fav.id === productId);
  };

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const getCartQuantity = (productId: string) => {
    return cartItems.find(item => item.product.id === productId)?.quantity ?? 0;
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'Favorites' || product.category === selectedCategory;
    const matchesFavorites = selectedCategory !== 'Favorites' || isFavorite(product.id);
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  // Handle authentication changes and guest data migration
  useEffect(() => {
    const handleAuthChange = async () => {
      if (authLoading) return;

      if (isAuthenticated && user) {
        const authenticatedUserId = user.id;
        const currentUserId = userId;

        // Check if we need to migrate guest data
        if (currentUserId.startsWith('guest_')) {
          await migrateGuestDataToUser(currentUserId, authenticatedUserId);
        }

        // Update userId to authenticated user
        setUserId(authenticatedUserId);
        localStorage.setItem('userId', authenticatedUserId);
      } else if (!isAuthenticated) {
        // Ensure we have a guest ID
        const stored = localStorage.getItem('userId');
        if (!stored || !stored.startsWith('guest_')) {
          const newId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('userId', newId);
          setUserId(newId);
        }
      }
    };

    handleAuthChange();
  }, [isAuthenticated, user, authLoading, userId]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (authLoading) return;

      setLoading(true);

      // Load products first (Priority)
      productService.getAllProducts().then(productsData => {
        setProducts(productsData);
        setLoading(false); // Show content as soon as products are ready
      });

      // Load user-specific data in background (Non-blocking)
      cartService.getCartItems(userId).then(cartData => {
        setCartItems(cartData);
      });

      favoritesService.getFavorites(userId).then(favoritesData => {
        setFavorites(favoritesData);
      });
    };

    if (userId) {
      loadInitialData();
    }
  }, [userId, authLoading]);

  useEffect(() => {
    if (loading) {
      setShowLoader(true);
      setShowSearchBar(false);
      setShowContent(false);
      return;
    }

    const loaderTimeout = setTimeout(() => setShowLoader(false), 220);
    const searchTimeout = setTimeout(() => setShowSearchBar(true), 120);
    const contentTimeout = setTimeout(() => setShowContent(true), 260);

    return () => {
      clearTimeout(loaderTimeout);
      clearTimeout(searchTimeout);
      clearTimeout(contentTimeout);
    };
  }, [loading]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY.current || currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-disco">
      <header className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 flex justify-center ${headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}>
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-b-2xl shadow-sm px-6 py-3 pb-4 max-w-xl">
          <div
            className={`flex items-center justify-center mb-3 transition-all duration-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide group max-w-fit">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === 'All'
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-800 hover:text-white'
                    : 'bg-white/20 text-gray-700 hover:bg-white/100 border border-white/30 hover:border-gray-300'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedCategory('Favorites')}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${selectedCategory === 'Favorites'
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-800 hover:text-white'
                    : 'bg-white/20 text-gray-700 hover:bg-white/100 border border-white/30 hover:border-gray-300'
                  }`}
              >
                <Heart size={12} />
                Favorites
              </button>
              {categories.slice(1).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === category
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-800 hover:text-white'
                      : 'bg-white/20 text-gray-700 hover:bg-white/100 border border-white/30 hover:border-gray-300'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`flex items-center gap-2 transition-all duration-200 ${showSearchBar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
          >
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white/40 backdrop-blur-md border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent focus:bg-white/50 text-sm text-gray-800 placeholder-gray-600 shadow-inner transition-all animate-pulse-subtle"
              />
            </div>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setIsProfileOpen(true);
                } else {
                  setIsAuthOpen(true);
                }
              }}
              className="relative p-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              <User size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              <ShoppingBag size={16} className="text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gray-600 text-gray-100 text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8 pt-40 md:px-8 px-4">
        {showLoader && (
          <div
            className={`text-center py-16 space-y-3 transition-opacity duration-200 ${loading ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
              Getting the storefront ready
            </p>
            <div className="flex justify-center">
              <span className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
            </div>
          </div>
        )}

        {!loading && (
          <>
            <div
              className={`columns-3 md:columns-4 gap-3 transition-all duration-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
            >
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductClick={setSelectedProduct}
                  onToggleFavorite={addToFavorites}
                  isFavorite={isFavorite(product.id)}
                  onAddToCart={addToCart}
                  cartQuantity={getCartQuantity(product.id)}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div
                className={`text-center py-16 transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <p className="text-slate-500">No products found</p>
              </div>
            )}
          </>
        )}
      </main>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          onToggleFavorite={addToFavorites}
          isFavorite={isFavorite(selectedProduct.id)}
        />
      )}

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        userId={userId}
        onCheckoutSuccess={async () => {
          await cartService.clearCart(userId);
          setCartItems([]);
        }}
      />

      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onRemoveFavorite={removeFavorite}
        onProductClick={setSelectedProduct}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userId={userId}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default App;
