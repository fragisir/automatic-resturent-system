"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getMenu, placeOrder, api } from "@/lib/api";
import io from "socket.io-client";
import LoadingOverlay from "@/components/LoadingOverlay";
import ThankYouOverlay from "@/components/ThankYouOverlay";
import CallStaffButton from "@/components/CallStaffButton";
import { listenToTableCall, StaffCall } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

const socket = io(
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace("/api", "") ||
    "http://localhost:5000",
  {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  }
);

interface MenuItem {
  _id: string;
  itemNumber: number;
  name: string;
  name_ne?: string;
  name_ja?: string;
  price: number;
  imageUrl?: string;
  category: string;
}

const translations = {
  en: {
    cart: "Cart",
    addToCart: "Add to Cart",
    placeOrder: "Place Order",
    total: "Total",
    orderStatus: "Order Status",
    yourFoodIsReady: "✨ Your food is ready!",
    cancelOrder: "Cancel Order",
    tableReserved: "Table Reserved",
    tryAgain: "Try Again",
    accessDenied: "Access Denied – Table Already Reserved",
    sessionExpired: "Session expired. Please refresh the page.",
    failedToPlaceOrder: "Failed to place order. Please try again.",
    orderCanceled: "Order canceled successfully.",
    failedToCancel: "Failed to cancel order.",
    pleaseAddItems: "Please add items to your cart",
    confirmCancel:
      "Cancel this order? You can place a new order after canceling.",
    tableInUse:
      "This table is currently in use. Please wait or choose another table.",
  },
  ne: {
    cart: "कार्ट",
    addToCart: "कार्टमा राख्नुहोस्",
    placeOrder: "अर्डर गर्नुहोस्",
    total: "जम्मा",
    orderStatus: "अर्डर स्थिति",
    yourFoodIsReady: "✨ तपाईंको खाना तयार छ!",
    cancelOrder: "अर्डर रद्द गर्नुहोस्",
    tableReserved: "टेबल आरक्षित छ",
    tryAgain: "फेरि प्रयास गर्नुहोस्",
    accessDenied: "प्रवेश अस्वीकृत - टेबल पहिले नै आरक्षित छ",
    sessionExpired: "सत्र समाप्त भयो। कृपया पृष्ठ रिफ्रेस गर्नुहोस्।",
    failedToPlaceOrder: "अर्डर गर्न असफल। कृपया फेरि प्रयास गर्नुहोस्।",
    orderCanceled: "अर्डर सफलतापूर्वक रद्द गरियो।",
    failedToCancel: "अर्डर रद्द गर्न असफल।",
    pleaseAddItems: "कृपया कार्टमा सामानहरू थप्नुहोस्",
    confirmCancel:
      "यो अर्डर रद्द गर्ने हो? रद्द गरेपछि तपाईं नयाँ अर्डर गर्न सक्नुहुन्छ।",
    tableInUse:
      "यो टेबल हाल प्रयोगमा छ। कृपया पर्खनुहोस् वा अर्को टेबल छान्नुहोस्।",
  },
  ja: {
    cart: "カート",
    addToCart: "カートに追加",
    placeOrder: "注文する",
    total: "合計",
    orderStatus: "注文状況",
    yourFoodIsReady: "✨ お食事ができました！",
    cancelOrder: "注文をキャンセル",
    tableReserved: "予約済み",
    tryAgain: "再試行",
    accessDenied: "アクセス拒否 - テーブルは既に予約されています",
    sessionExpired: "セッションが期限切れです。ページを更新してください。",
    failedToPlaceOrder: "注文に失敗しました。もう一度お試しください。",
    orderCanceled: "注文が正常にキャンセルされました。",
    failedToCancel: "注文のキャンセルに失敗しました。",
    pleaseAddItems: "カートに商品を追加してください",
    confirmCancel:
      "この注文をキャンセルしますか？キャンセル後に新しい注文を行えます。",
    tableInUse:
      "このテーブルは現在使用中です。お待ちいただくか、別のテーブルをお選びください。",
  },
};

interface CartItem extends MenuItem {
  quantity: number;
}

interface Order {
  _id: string;
  tableNumber: number;
  status: "NEW" | "COOKING" | "READY" | "PAID";
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
  const table = searchParams.get("table");

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTableReserved, setIsTableReserved] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [staffCall, setStaffCall] = useState<StaffCall | null>(null);
  const [language, setLanguage] = useState<"en" | "ne" | "ja" | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Check session storage first (for page reloads)
    const savedLang = sessionStorage.getItem("orderLanguage");
    if (savedLang) {
      setLanguage(savedLang as "en" | "ne" | "ja");
    }
  }, []);

  const handleSetLanguage = (lang: "en" | "ne" | "ja") => {
    setLanguage(lang);
    sessionStorage.setItem("orderLanguage", lang);
    showToast(
      lang === "ne"
        ? "भाषा नेपालीमा परिवर्तन गरियो"
        : lang === "ja"
        ? "言語が日本語に変更されました"
        : "Language set to English",
      "success"
    );
  };

  const t = language ? translations[language] : translations["en"];

  const getLocalizedName = (item: MenuItem | CartItem) => {
    if (language === "ne" && item.name_ne) return item.name_ne;
    if (language === "ja" && item.name_ja) return item.name_ja;
    return item.name;
  };

  useEffect(() => {
    socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
    socket.on("disconnect", () => console.log("❌ Socket disconnected"));
    socket.on("connect_error", (error) =>
      console.error("Socket connection error:", error)
    );

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
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
        const res = await api.post("/orders/create-session", {
          tableNumber: parseInt(table),
        });
        const { token, sessionId: sessId, expiresAt: expiry } = res.data;
        setSessionToken(token);
        setSessionId(sessId);
        setExpiresAt(new Date(expiry));
      } catch (err: any) {
        console.error("Session creation failed:", err);
        if (
          err.response &&
          err.response.status === 403 &&
          err.response.data.reserved
        ) {
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
      console.log("📡 Received order_status_updated:", updatedOrder);

      if (updatedOrder.tableNumber === parseInt(table)) {
        console.log("✅ Update is for our table:", table);

        if (updatedOrder.status === "PAID") {
          console.log("💰 Order is PAID - showing thank you overlay");
          setShowThankYou(true);
          setActiveOrder(updatedOrder);
          setTimeout(() => {
            console.log("🔄 Reloading page...");
            window.location.reload();
          }, 5000);
        } else {
          console.log("🔄 Order status changed to:", updatedOrder.status);
          setTimeout(() => {
            setActiveOrder(updatedOrder);
          }, 2000);
        }
      }
    };

    socket.on("order_status_updated", handleStatusUpdate);
    return () => {
      socket.off("order_status_updated", handleStatusUpdate);
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
            const res = await api.post("/orders/refresh-token", {
              tableNumber: parseInt(table),
              sessionId,
            });
            setSessionToken(res.data.token);
            setExpiresAt(new Date(res.data.expiresAt));
            setIsLoading(false);
          } catch (err) {
            console.error("Failed to refresh token", err);
            setIsLoading(false);
          }
        }, timeUntilExpiry);
      } else if (timeUntilExpiry <= 0) {
        setIsLoading(true);
        api
          .post("/orders/refresh-token", {
            tableNumber: parseInt(table),
            sessionId,
          })
          .then((res) => {
            setSessionToken(res.data.token);
            setExpiresAt(new Date(res.data.expiresAt));
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 10000);
    return () => clearInterval(interval);
  }, [expiresAt, sessionId, table, isTableReserved]);

  // Listen for staff calls
  useEffect(() => {
    if (!table) return;

    const unsubscribe = listenToTableCall(
      parseInt(table),
      (call) => {
        setStaffCall(call);
      },
      (error) => {
        console.error("Error listening to table call:", error);
      }
    );

    return () => unsubscribe();
  }, [table]);

  const categories = useMemo(() => {
    const cats = [
      "All",
      ...Array.from(new Set(menu.map((item) => item.category))),
    ];
    return cats;
  }, [menu]);

  const filteredMenu = useMemo(() => {
    if (selectedCategory === "All") return menu;
    return menu.filter((item) => item.category === selectedCategory);
  }, [menu, selectedCategory]);

  const addToCart = (item: MenuItem, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) {
        return prev.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    showToast(`Added ${getLocalizedName(item)} to cart`, "success");
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i._id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i._id === itemId ? { ...i, quantity } : i))
      );
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast(t.pleaseAddItems, "info");
      return;
    }

    if (!sessionToken) {
      showToast(t.sessionExpired, "error");
      return;
    }

    try {
      const orderData = {
        tableNumber: parseInt(table!),
        items: cart.map((item) => ({
          itemNumber: item.itemNumber,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          price: item.price,
        })),
        token: sessionToken,
      };

      const newOrder = await placeOrder(orderData);
      setActiveOrder(newOrder);
      setCart([]);
      setShowCart(false);
      showToast("Order placed successfully! 🍳", "success");
    } catch (err: any) {
      console.error("Failed to place order:", err);
      if (err.response && err.response.status === 401) {
        showToast(t.sessionExpired, "error");
        window.location.reload();
      } else {
        showToast(t.failedToPlaceOrder, "error");
      }
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (isLoading) {
    return <LoadingOverlay message="Refreshing your session..." />;
  }

  if (!language) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-orange-500/30">
            <span className="text-5xl">🌐</span>
          </div>

          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
            Welcome To Smart Resturent
          </h1>
          <p className="text-gray-500 mb-10 text-lg">Select language</p>

          <div className="space-y-4">
            <button
              onClick={() => handleSetLanguage("en")}
              className="w-full bg-white hover:bg-red-50 border-2 border-gray-100 hover:border-red-500 p-4 rounded-2xl flex items-center gap-5 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <span className="text-4xl drop-shadow-sm">🇺🇸</span>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                  English
                </div>
                <div className="text-sm text-gray-500">Select English</div>
              </div>
            </button>

            <button
              onClick={() => handleSetLanguage("ne")}
              className="w-full bg-white hover:bg-red-50 border-2 border-gray-100 hover:border-red-500 p-4 rounded-2xl flex items-center gap-5 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <span className="text-4xl drop-shadow-sm">🇳🇵</span>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                  नेपाली
                </div>
                <div className="text-sm text-gray-500">
                  नेपाली भाषा छान्नुहोस्
                </div>
              </div>
            </button>

            <button
              onClick={() => handleSetLanguage("ja")}
              className="w-full bg-white hover:bg-red-50 border-2 border-gray-100 hover:border-red-500 p-4 rounded-2xl flex items-center gap-5 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <span className="text-4xl drop-shadow-sm">🇯🇵</span>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                  日本語
                </div>
                <div className="text-sm text-gray-500">日本語を選択</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isTableReserved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t.tableReserved}
          </h1>
          <p className="text-gray-600 mb-6">{t.tableInUse}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition font-medium"
          >
            {t.tryAgain}
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
              <span className="text-4xl">🍽️ </span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Table {table}
            </h1>
            <p className="text-sm text-gray-500">
              Order #{activeOrder._id.slice(-6).toUpperCase()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl mb-6">
            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider text-center">
              {t.orderStatus}
            </div>
            <div
              className={`text-4xl font-black text-center mb-2 ${
                activeOrder.status === "NEW"
                  ? "text-yellow-500"
                  : activeOrder.status === "COOKING"
                  ? "text-orange-500"
                  : activeOrder.status === "READY"
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              {activeOrder.status === "PAID" ? "READY" : activeOrder.status}
            </div>
            {activeOrder.status === "READY" && (
              <div className="text-center text-green-700 font-semibold text-sm animate-pulse">
                {t.yourFoodIsReady}
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {activeOrder.items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    {item.quantity}x
                  </span>
                  <span className="font-medium text-gray-900">
                    {(() => {
                      // Try to find the item in the menu to get localized name
                      const menuItem = menu.find(
                        (m) => m.itemNumber === item.itemNumber
                      );
                      return menuItem ? getLocalizedName(menuItem) : item.name;
                    })()}
                  </span>
                </div>
                <span className="font-bold text-gray-900">
                  ¥{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200 mb-6">
            <span className="text-lg font-bold text-gray-900">{t.total}</span>
            <span className="text-3xl font-black text-red-600">
              ¥
              {activeOrder.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              )}
            </span>
          </div>

          {/* Cancel Order Button - Only show if order is NEW */}
          {activeOrder.status === "NEW" && (
            <button
              onClick={async () => {
                if (confirm(t.confirmCancel)) {
                  try {
                    await api.delete(`/orders/${activeOrder._id}`);
                    setActiveOrder(null);
                    showToast(t.orderCanceled, "success");
                  } catch (err) {
                    showToast(t.failedToCancel, "error");
                  }
                }
              }}
              className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-bold"
            >
              {t.cancelOrder}
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
          <div className="flex justify-between items-center gap-3">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                EasyOne
              </h1>
              <p className="text-sm text-gray-600 font-medium">Table {table}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) =>
                  handleSetLanguage(e.target.value as "en" | "ne" | "ja")
                }
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5"
              >
                <option value="en">🇺🇸 English</option>
                <option value="ne">🇳🇵 नेपाली</option>
                <option value="ja">🇯🇵 日本語</option>
              </select>
              <CallStaffButton
                tableNumber={parseInt(table!)}
                isCalling={!!staffCall}
              />
              {cart.length > 0 && (
                <button
                  onClick={() => setShowCart(true)}
                  className="relative bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <span className="font-bold">
                    {t.cart} ({totalItems})
                  </span>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
                      {totalItems}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="overflow-x-auto px-4 pb-4">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg transform scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow"
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
          {filteredMenu.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              {item.imageUrl ? (
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🍽️%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                  <span className="text-6xl">🍽️</span>
                </div>
              )}

              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 text-sm">
                  {getLocalizedName(item)}
                </h3>
                <p className="text-2xl font-black text-red-600 mb-3">
                  ¥{item.price}
                </p>
                <button
                  onClick={() => addToCart(item, 1)}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-2.5 rounded-xl hover:shadow-lg transition-all font-bold text-sm transform hover:scale-105"
                >
                  {t.addToCart}
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
                <h2 className="text-2xl font-black text-gray-900">{t.cart}</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cart.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {getLocalizedName(item)}
                    </h3>
                    <p className="text-sm text-gray-500">¥{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow">
                    <button
                      onClick={() =>
                        updateCartQuantity(item._id, item.quantity - 1)
                      }
                      className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200"
                    >
                      −
                    </button>
                    <span className="font-bold text-gray-900 min-w-[30px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateCartQuantity(item._id, item.quantity + 1)
                      }
                      className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-black text-red-600 text-lg min-w-[80px] text-right">
                    ¥{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold text-gray-900">
                  {t.total}
                </span>
                <span className="text-3xl font-black text-red-600">
                  ¥{totalPrice}
                </span>
              </div>
              <button
                onClick={handlePlaceOrder}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-2xl hover:shadow-xl transition-all font-black text-lg transform hover:scale-105"
              >
                {t.placeOrder} ({totalItems})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay handled at top level now, but keeping for other async ops if needed  not use now*/}
      {isLoading && <LoadingOverlay message="Processing..." />}
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
