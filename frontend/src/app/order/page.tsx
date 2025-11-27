"use client";

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMenu, placeOrder, api } from '@/lib/api';
import io from 'socket.io-client';
import LoadingOverlay from '@/components/LoadingOverlay';
import ThankYouOverlay from '@/components/ThankYouOverlay';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

interface MenuItem {
  _id: string;
  itemNumber: number;
  name: string;
  price: number;
  imageUrl?: string;
  category: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Order {
  _id: string;
  tableNumber: number;
  status: 'NEW' | 'COOKING' | 'READY' | 'PAID';
  items: {
    itemNumber: number;
    name: string;
    imageUrl?: string;
    quantity: number;
    price: number;
  }[];
}

function OrderContent() {
  const searchParams = useSearchParams();
  const table = searchParams.get('table');
  
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTableReserved, setIsTableReserved] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
    socket.on('disconnect', () => console.log('❌ Socket disconnected'));
    socket.on('connect_error', (error) => console.error('Socket connection error:', error));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  useEffect(() => {
    if (!table) {
      setError("No table number specified");
      return;
    }

    getMenu().then(setMenu).catch(console.error);

    if (activeOrder) return;

    const createSession = async () => {
      try {
        const res = await api.post('/orders/create-session', { tableNumber: parseInt(table) });
        const { token, sessionId: sessId, expiresAt: expiry } = res.data;
        setSessionToken(token);
        setSessionId(sessId);
        setExpiresAt(new Date(expiry));
      } catch (err: any) {
        console.error('Session creation failed:', err);
        if (err.response && err.response.status === 403 && err.response.data.reserved) {
          setIsTableReserved(true);
          setError("Access Denied – Table Already Reserved");
        } else {
          setError("Failed to create session. Please try again.");
        }
      }
    };

    createSession();
  }, [table, activeOrder]);

  useEffect(() => {
    if (!table) return;

    const handleStatusUpdate = (updatedOrder: Order) => {
      console.log('📡 Received order_status_updated:', updatedOrder);
      
      if (updatedOrder.tableNumber === parseInt(table)) {
        console.log('✅ Update is for our table:', table);
        
        if (updatedOrder.status === 'PAID') {
          console.log('💰 Order is PAID - showing thank you overlay');
          setShowThankYou(true);
          setActiveOrder(updatedOrder);
          setTimeout(() => {
            console.log('🔄 Reloading page...');
            window.location.reload();
          }, 5000);
        } else {
          console.log('🔄 Order status changed to:', updatedOrder.status);
          setTimeout(() => {
            setActiveOrder(updatedOrder);
          }, 2000);
        }
      }
    };

    socket.on('order_status_updated', handleStatusUpdate);
    return () => {
      socket.off('order_status_updated', handleStatusUpdate);
    };
  }, [table]);

  useEffect(() => {
    if (!expiresAt || !sessionId || !table || isTableReserved) return;

    const checkAndRefresh = () => {
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry <= 30000 && timeUntilExpiry > 0) {
        setIsLoading(true);
        setTimeout(async () => {
          try {
            const res = await api.post('/orders/refresh-token', { tableNumber: parseInt(table), sessionId });
            setSessionToken(res.data.token);
            setExpiresAt(new Date(res.data.expiresAt));
            setIsLoading(false);
          } catch (err) {
            console.error('Failed to refresh token', err);
            setIsLoading(false);
          }
        }, timeUntilExpiry);
      } else if (timeUntilExpiry <= 0) {
        setIsLoading(true);
        api.post('/orders/refresh-token', { tableNumber: parseInt(table), sessionId })
          .then(res => {
            setSessionToken(res.data.token);
            setExpiresAt(new Date(res.data.expiresAt));
            setIsLoading(false);
          }).catch(() => setIsLoading(false));
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 10000);
    return () => clearInterval(interval);
  }, [expiresAt, sessionId, table, isTableReserved]);

  const categories = useMemo(() => {
    const cats = ['All', ...Array.from(new Set(menu.map(item => item.category)))];
    return cats;
  }, [menu]);

  const filteredMenu = useMemo(() => {
    if (selectedCategory === 'All') return menu;
    return menu.filter(item => item.category === selectedCategory);
  }, [menu, selectedCategory]);

  const addToCart = (item: MenuItem, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) {
        return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => i._id !== itemId));
    } else {
      setCart(prev => prev.map(i => i._id === itemId ? { ...i, quantity } : i));
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your cart');
      return;
    }

    if (!sessionToken) {
      alert('Session expired. Please refresh the page.');
      return;
    }

    try {
      const orderData = {
        tableNumber: parseInt(table!),
        items: cart.map(item => ({
          itemNumber: item.itemNumber,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          price: item.price
        })),
        token: sessionToken
      };

      const newOrder = await placeOrder(orderData);
      setActiveOrder(newOrder);
      setCart([]);
      setShowCart(false);
    } catch (err: any) {
      console.error('Failed to place order:', err);
      if (err.response && err.response.status === 401) {
        alert('Session expired. Please refresh the page.');
        window.location.reload();
      } else {
        alert('Failed to place order. Please try again.');
      }
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (isTableReserved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Table Reserved</h1>
          <p className="text-gray-600 mb-6">
            This table is currently in use. Please wait or choose another table.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (activeOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">🍽️</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Table {table}</h1>
            <p className="text-sm text-gray-500">Order #{activeOrder._id.slice(-6).toUpperCase()}</p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl mb-6">
            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider text-center">Order Status</div>
            <div className={`text-4xl font-black text-center mb-2 ${
              activeOrder.status === 'NEW' ? 'text-yellow-500' :
              activeOrder.status === 'COOKING' ? 'text-orange-500' :
              activeOrder.status === 'READY' ? 'text-green-600' : 'text-gray-400'
            }`}>
              {activeOrder.status === 'PAID' ? 'READY' : activeOrder.status}
            </div>
            {activeOrder.status === 'READY' && (
              <div className="text-center text-green-700 font-semibold text-sm animate-pulse">
                ✨ Your food is ready!
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {activeOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg">{item.quantity}x</span>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">¥{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200 mb-6">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-3xl font-black text-red-600">
              ¥{activeOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            </span>
          </div>

          {/* Cancel Order Button - Only show if order is NEW */}
          {activeOrder.status === 'NEW' && (
            <button
              onClick={async () => {
                if (confirm('Cancel this order? You can place a new order after canceling.')) {
                  try {
                    await api.delete(`/orders/${activeOrder._id}`);
                    setActiveOrder(null);
                    alert('Order canceled successfully. You can now place a new order.');
                  } catch (err) {
                    alert('Failed to cancel order. Please try again.');
                  }
                }
              }}
              className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-bold"
            >
              Cancel Order
            </button>
          )}
        </div>
        
        {showThankYou && <ThankYouOverlay />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                EasyOne
              </h1>
              <p className="text-sm text-gray-600 font-medium">Table {table}</p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <span className="font-bold">🛒 Cart ({totalItems})</span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Categories */}
        <div className="overflow-x-auto px-4 pb-4">
          <div className="flex gap-2 min-w-max">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                  selectedCategory === cat 
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg transform scale-105' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Items */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-32">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenu.map(item => (
            <div key={item._id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
              {item.imageUrl ? (
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🍽️%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                  <span className="text-6xl">🍽️</span>
                </div>
              )}
              
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 text-sm">{item.name}</h3>
                <p className="text-2xl font-black text-red-600 mb-3">¥{item.price}</p>
                <button
                  onClick={() => addToCart(item, 1)}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-2.5 rounded-xl hover:shadow-lg transition-all font-bold text-sm transform hover:scale-105"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cart.map(item => (
                <div key={item._id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">¥{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow">
                    <button
                      onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                      className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200"
                    >
                      −
                    </button>
                    <span className="font-bold text-gray-900 min-w-[30px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                      className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-black text-red-600 text-lg min-w-[80px] text-right">¥{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold text-gray-900">Total</span>
                <span className="text-3xl font-black text-red-600">¥{totalPrice}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-2xl hover:shadow-xl transition-all font-black text-lg transform hover:scale-105"
              >
                Place Order ({totalItems} items)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isLoading && <LoadingOverlay message="Refreshing your session..." />}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderContent />
    </Suspense>
  );
}
