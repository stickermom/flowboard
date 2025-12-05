import { Calendar, LogOut, MapPin, Navigation, Package, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarColor, getAvatarUrl, getInitials } from '../lib/avatarUtils';
import { formatINR } from '../lib/currency';
import { getAddressFromLocation } from '../lib/locationService';
import { supabase } from '../lib/supabase';
import { Address, Order, UserPreferences } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

type TabType = 'orders' | 'addresses' | 'preferences';

function UserAvatar({ profile, user }: { profile: { full_name: string | null; email: string; avatar_url: string | null }; user: any }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getAvatarUrl(profile, user);
  const initials = getInitials(profile.full_name, profile.email);
  const avatarColor = getAvatarColor(profile.full_name, profile.email);

  if (avatarUrl && !imgError) {
    return (
      <img
        key={avatarUrl}
        src={avatarUrl}
        alt={profile.full_name || profile.email}
        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold border-2 border-gray-200`}>
      {initials}
    </div>
  );
}

export default function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
  const { profile, user, isAuthenticated, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    is_default: false,
  });

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'orders') {
        fetchOrders();
      } else if (activeTab === 'addresses') {
        fetchAddresses();
      } else if (activeTab === 'preferences') {
        fetchPreferences();
      }
    }
  }, [isOpen, activeTab, userId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const fetchAddresses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (!error && data) {
      setAddresses(data as Address[]);
    }
    setLoading(false);
  };

  const fetchPreferences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setPreferences(data as UserPreferences);
    } else if (!data) {
      const newPrefs = {
        user_id: userId,
        email_notifications: true,
        sms_notifications: false,
        newsletter: true,
      };
      const { data: created } = await supabase
        .from('user_preferences')
        .insert(newPrefs)
        .select()
        .single();
      if (created) {
        setPreferences(created as UserPreferences);
      }
    }
    setLoading(false);
  };

  const handleAddAddress = async () => {
    if (!addressForm.name || !addressForm.street || !addressForm.city || !addressForm.state || !addressForm.postal_code) {
      return;
    }

    const addressData = {
      ...addressForm,
      user_id: userId,
    };

    if (editingAddress) {
      const { error } = await supabase
        .from('addresses')
        .update(addressData)
        .eq('id', editingAddress.id);

      if (!error) {
        fetchAddresses();
        resetAddressForm();
      }
    } else {
      const { error } = await supabase
        .from('addresses')
        .insert(addressData);

      if (!error) {
        fetchAddresses();
        resetAddressForm();
      }
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchAddresses();
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);

    const { error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', id);

    if (!error) {
      fetchAddresses();
    }
  };

  const handleUpdatePreferences = async (field: keyof Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>, value: boolean) => {
    if (!preferences) return;

    const { error } = await supabase
      .from('user_preferences')
      .update({ [field]: value })
      .eq('user_id', userId);

    if (!error) {
      setPreferences({ ...preferences, [field]: value });
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      name: '',
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      is_default: false,
    });
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  const startEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      name: address.name,
      street: address.street,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setShowAddressForm(true);
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    try {
      console.log('Requesting location...');
      const address = await getAddressFromLocation();
      console.log('Address received:', address);

      setAddressForm({
        ...addressForm,
        street: address.street || addressForm.street,
        city: address.city || addressForm.city,
        state: address.state || addressForm.state,
        postal_code: address.postal_code || addressForm.postal_code,
        country: address.country || addressForm.country || 'US',
      });

      // If address name is empty, suggest "Home"
      if (!addressForm.name.trim()) {
        setAddressForm(prev => ({ ...prev, name: 'Home' }));
      }
    } catch (error) {
      console.error('Location error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get your location.';

      // More user-friendly error messages with better formatting
      if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
        const permissionMessage = errorMessage.split('\n').join('\n');
        alert(permissionMessage);
      } else if (errorMessage.includes('unavailable')) {
        alert('Unable to get your location. Please check your device location settings or enter address manually.');
      } else if (errorMessage.includes('timeout')) {
        alert('Location request timed out. Please try again or enter address manually.');
      } else {
        alert(`${errorMessage}\n\nPlease enter address manually.`);
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    orderFilter === 'all' ? true : order.status === orderFilter
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-2xl font-bold text-gray-800">Profile</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {isAuthenticated && profile && (
            <div className="px-6 pb-6">
              <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
                <UserAvatar profile={profile} user={user} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {profile.full_name || 'User'}
                  </h3>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                  {profile.phone && (
                    <p className="text-sm text-gray-500">{profile.phone}</p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'orders'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Package size={18} />
            Orders
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'addresses'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <MapPin size={18} />
            Addresses
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'preferences'
              ? 'text-gray-800 border-b-2 border-gray-800'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Settings size={18} />
            Preferences
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'orders' && (
            <div>
              <div className="flex gap-2 mb-6 flex-wrap">
                {(['all', 'completed', 'pending', 'cancelled'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${orderFilter === filter
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">Order #{order.order_number}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar size={14} />
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="space-y-2 mb-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-gray-800">{item.product.title}</p>
                              <p className="text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium text-gray-800">
                              {formatINR(item.product.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-gray-600">Total</span>
                        <span className="text-lg font-bold text-gray-800">
                          {formatINR(order.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div>
              {!showAddressForm && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <MapPin size={18} />
                    + Add New Address
                  </button>
                </div>
              )}

              {showAddressForm && (
                <div className="mb-6 p-6 bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {editingAddress ? 'Edit Address' : 'New Address'}
                    </h3>
                    <button
                      onClick={handleUseLocation}
                      disabled={locationLoading}
                      className="w-10 h-10 flex items-center justify-center bg-white/60 backdrop-blur-sm border border-white/40 rounded-full hover:bg-white/80 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={locationLoading ? 'Getting Location...' : 'Use My Location'}
                    >
                      <Navigation size={18} className={locationLoading ? 'animate-spin text-blue-600' : 'text-gray-700'} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Address Name (e.g., Home, Work)"
                      value={addressForm.name}
                      onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                      className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all placeholder:text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all placeholder:text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all placeholder:text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all placeholder:text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={addressForm.postal_code}
                      onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                      className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all placeholder:text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={addressForm.country}
                      onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                      className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <label className="flex items-center gap-3 mt-6 text-sm text-gray-700 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <span className="group-hover:text-gray-900 transition-colors">Set as default address</span>
                  </label>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleAddAddress}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all font-medium shadow-md hover:shadow-lg"
                    >
                      {editingAddress ? 'Update' : 'Save'} Address
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600"></div>
                  <p className="mt-4 text-gray-500">Loading addresses...</p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/40 backdrop-blur-sm border border-white/30 mb-4">
                    <MapPin size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No addresses saved</p>
                  <p className="text-gray-400 text-sm mt-2">Add your first address to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {addresses.map(address => (
                    <div key={address.id} className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-5 hover:bg-white/70 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-gray-800 text-lg">{address.name}</p>
                            {address.is_default && (
                              <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-full shadow-sm">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p className="flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400" />
                              {address.street}
                            </p>
                            <p>
                              {address.city}, {address.state} {address.postal_code}
                            </p>
                            <p className="text-gray-500">{address.country}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEditAddress(address)}
                            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 bg-white/60 backdrop-blur-sm hover:bg-white/80 border border-white/40 rounded-xl transition-all font-medium"
                          >
                            Edit
                          </button>
                          {!address.is_default && (
                            <button
                              onClick={() => handleSetDefaultAddress(address.id)}
                              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 bg-white/60 backdrop-blur-sm hover:bg-white/80 border border-white/40 rounded-xl transition-all font-medium"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50/80 border border-red-200/40 rounded-xl transition-all font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading preferences...</div>
              ) : preferences ? (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">Notifications</h3>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700">Email Notifications</span>
                        <input
                          type="checkbox"
                          checked={preferences.email_notifications}
                          onChange={(e) => handleUpdatePreferences('email_notifications', e.target.checked)}
                          className="w-5 h-5"
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700">SMS Notifications</span>
                        <input
                          type="checkbox"
                          checked={preferences.sms_notifications}
                          onChange={(e) => handleUpdatePreferences('sms_notifications', e.target.checked)}
                          className="w-5 h-5"
                        />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-gray-700">Newsletter Subscription</span>
                        <input
                          type="checkbox"
                          checked={preferences.newsletter}
                          onChange={(e) => handleUpdatePreferences('newsletter', e.target.checked)}
                          className="w-5 h-5"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Unable to load preferences</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
