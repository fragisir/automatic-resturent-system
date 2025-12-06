"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import io from "socket.io-client";
import AnimatedStatCard from "@/components/AnimatedStatCard";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import CircularProgress from "@/components/CircularProgress";
import TablePerformance from "@/components/TablePerformance";
import OrderHeatmap from "@/components/OrderHeatmap";
import NotificationBell from "@/components/NotificationBell";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const socket = io(
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace("/api", "") ||
    "http://localhost:5000"
);

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("orders");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [qrCodes, setQrCodes] = useState<{ table: number; url: string }[]>([]);

  const [newItem, setNewItem] = useState({
    itemNumber: "",
    name: "",
    name_ne: "",
    name_ja: "",
    price: "",
    category: "",
    imageUrl: "",
    prepStation: "kitchen",
  });

  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      fetchData();
    }
  }, [activeTab, router]);

  useEffect(() => {
    socket.on("new_order", (order: any) => {
      setOrders((prev) => [order, ...prev]);
      if (activeTab === "analytics") fetchAnalytics();
    });

    socket.on("order_status_updated", (updatedOrder: any) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
      if (activeTab === "analytics") fetchAnalytics();
    });

    return () => {
      socket.off("new_order");
      socket.off("order_status_updated");
    };
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/admin/analytics");
      setAnalytics(res.data);
    } catch (error) {
      console.error("Failed to fetch analytics");
    }
  };

  const fetchData = async () => {
    if (activeTab === "menu") {
      const res = await api.get("/menu");
      setMenuItems(res.data);
    } else if (activeTab === "orders") {
      const res = await api.get("/orders");
      setOrders(res.data);
    } else if (activeTab === "analytics") {
      fetchAnalytics();
    } else if (activeTab === "qr") {
      const res = await api.get("/admin/qr-codes");
      setQrCodes(res.data);
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/menu", newItem);
      setNewItem({
        itemNumber: "",
        name: "",
        name_ne: "",
        name_ja: "",
        price: "",
        category: "",
        imageUrl: "",
        prepStation: "kitchen",
      });
      fetchData();
    } catch (err) {
      alert("Failed to add item");
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (confirm("Delete this item?")) {
      await api.delete(`/menu/${id}`);
      fetchData();
    }
  };

  const handleEditMenu = (item: any) => {
    setEditingItem({
      _id: item._id,
      itemNumber: item.itemNumber.toString(),
      name: item.name,
      name_ne: item.name_ne || "",
      name_ja: item.name_ja || "",
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || "",
      prepStation: item.prepStation,
    });
    setShowEditModal(true);
  };

  const handleUpdateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/menu/${editingItem._id}`, {
        itemNumber: parseInt(editingItem.itemNumber),
        name: editingItem.name,
        name_ne: editingItem.name_ne,
        name_ja: editingItem.name_ja,
        price: parseFloat(editingItem.price),
        category: editingItem.category,
        imageUrl: editingItem.imageUrl,
        prepStation: editingItem.prepStation,
      });
      setShowEditModal(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      alert("Failed to update item");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    fetchData();
  };

  const menuTabs = [
    { id: "orders", label: "Orders", icon: "📋" },
    { id: "menu", label: "Menu", icon: "🍽️" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "qr", label: "QR Codes", icon: "📱" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Smart Restaurant</h1>
          <p className="text-xs text-gray-500 mt-1">Admin </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.removeItem("adminToken");
              router.push("/admin/login");
            }}
            className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Orders Dashboard
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Manage and track real-time orders
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <NotificationBell orders={orders} />
                  <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 shadow-sm">
                    {orders.length} Total
                  </span>
                  <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium shadow-sm ring-1 ring-orange-200">
                    {orders.filter((o) => o.status !== "PAID").length} Active
                  </span>
                </div>
              </div>

              {/* Orders  */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">💰</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Today's Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ¥
                    {orders
                      .reduce((sum, order) => {
                        const orderTotal = order.items.reduce(
                          (s: number, i: any) => s + i.price * i.quantity,
                          0
                        );
                        return sum + orderTotal;
                      }, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">📝</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Total Orders
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {orders.length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-6xl">⏳</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Pending Orders
                  </p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {orders.filter((o) => o.status !== "PAID").length}
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
                  <div className="text-6xl mb-4">🍽️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No orders yet
                  </h3>
                  <p className="text-gray-500">
                    New orders will appear here automatically
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {orders
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((order) => (
                      <div
                        key={order._id}
                        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
                              {order.tableNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900">
                                  Table {order.tableNumber}
                                </h3>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                                    order.status === "NEW"
                                      ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200"
                                      : order.status === "COOKING"
                                      ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
                                      : order.status === "READY"
                                      ? "bg-green-100 text-green-700 ring-1 ring-green-200"
                                      : "bg-gray-100 text-green-600 ring-1 ring-gray-200"
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <span>
                                  🕒{" "}
                                  {new Date(
                                    order.createdAt
                                  ).toLocaleTimeString()}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>
                                  📅{" "}
                                  {new Date(
                                    order.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              ¥
                              {order.items
                                .reduce(
                                  (sum: number, item: any) =>
                                    sum + item.price * item.quantity,
                                  0
                                )
                                .toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              {order.items.reduce(
                                (sum: number, item: any) => sum + item.quantity,
                                0
                              )}{" "}
                              items total
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                              Order Items
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                              {order.items.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-sm group"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="bg-white w-6 h-6 rounded-md flex items-center justify-center font-bold text-gray-700 shadow-sm border border-gray-100">
                                      {item.quantity}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="text-gray-600 font-medium tabular-nums">
                                    ¥
                                    {(
                                      item.price * item.quantity
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col justify-end gap-3">
                            {order.status === "NEW" && (
                              <button
                                onClick={() =>
                                  updateStatus(order._id, "COOKING")
                                }
                                className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:scale-95 transition shadow-lg shadow-orange-200"
                              >
                                Start Cooking 🔥
                              </button>
                            )}
                            {order.status === "COOKING" && (
                              <button
                                onClick={() => updateStatus(order._id, "READY")}
                                className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 active:scale-95 transition shadow-lg shadow-green-200"
                              >
                                Mark Ready ✅
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(order._id, "PAID")}
                              className={`w-full py-3 font-semibold rounded-xl transition active:scale-95 ${
                                order.status === "PAID"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                              }`}
                              disabled={order.status === "PAID"}
                            >
                              {order.status === "PAID"
                                ? "Paid"
                                : "Mark as Paid 💳"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Menu Tab */}
          {activeTab === "menu" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Menu Management
              </h2>

              <form
                onSubmit={handleAddMenu}
                className="bg-white rounded-xl p-6 border border-gray-200"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Add New Item
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    placeholder="Item Number"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.itemNumber}
                    onChange={(e) =>
                      setNewItem({ ...newItem, itemNumber: e.target.value })
                    }
                    required
                  />
                  <input
                    placeholder="Name (English)"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    required
                  />
                  <input
                    placeholder="Name (Nepali)"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.name_ne}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name_ne: e.target.value })
                    }
                  />
                  <input
                    placeholder="Name (Japanese)"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.name_ja}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name_ja: e.target.value })
                    }
                  />
                  <input
                    placeholder="Price (¥)"
                    type="number"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                    required
                  />
                  <input
                    placeholder="Category"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    required
                  />
                  <input
                    placeholder="Image URL (optional)"
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.imageUrl}
                    onChange={(e) =>
                      setNewItem({ ...newItem, imageUrl: e.target.value })
                    }
                  />
                  <select
                    className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newItem.prepStation}
                    onChange={(e) =>
                      setNewItem({ ...newItem, prepStation: e.target.value })
                    }
                  >
                    <option value="kitchen">Kitchen</option>
                    <option value="bar">Bar</option>
                    <option value="pizza">Pizza</option>
                    <option value="grill">Grill</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Add Menu Item
                </button>
              </form>

              <div className="grid grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          #{item.itemNumber}
                        </p>
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          ¥{item.price}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMenu(item)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(item._id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {item.category}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        {item.prepStation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && analytics && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Analytics Overview
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Performance insights and top selling items
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">💰</span>
                  </div>
                  <p className="text-blue-100 text-sm uppercase tracking-wider mb-1">
                    Total Revenue
                  </p>
                  <p className="text-3xl font-bold">
                    ¥{analytics.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">📝</span>
                  </div>
                  <p className="text-purple-100 text-sm uppercase tracking-wider mb-1">
                    Total Orders
                  </p>
                  <p className="text-3xl font-bold">{analytics.ordersCount}</p>
                </div>

                <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">📊</span>
                  </div>
                  <p className="text-green-100 text-sm uppercase tracking-wider mb-1">
                    Avg Order Value
                  </p>
                  <p className="text-3xl font-bold">
                    ¥
                    {Math.round(
                      analytics.totalRevenue / (analytics.ordersCount || 1)
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">🔥</span>
                  </div>
                  <p className="text-orange-100 text-sm uppercase tracking-wider mb-1">
                    Top Item
                  </p>
                  <p className="text-xl font-bold truncate">
                    {analytics.mostOrdered[0]?.name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Two Main Graphs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graph 1: Revenue Trend */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Revenue Trend
                    </h3>
                    <p className="text-sm text-gray-500">
                      Hourly revenue performance
                    </p>
                  </div>
                  <AnalyticsCharts analytics={analytics} orders={orders} />
                </div>

                {/* Graph 2: Order Status Distribution */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Order Status
                    </h3>
                    <p className="text-sm text-gray-500">
                      Current order pipeline
                    </p>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const statuses = {
                            NEW: { count: 0, color: "#fbbf24", label: "New" },
                            COOKING: {
                              count: 0,
                              color: "#f97316",
                              label: "Cooking",
                            },
                            READY: {
                              count: 0,
                              color: "#22c55e",
                              label: "Ready",
                            },
                            PAID: { count: 0, color: "#3b82f6", label: "Paid" },
                          };
                          orders.forEach((order: any) => {
                            if (
                              statuses[order.status as keyof typeof statuses]
                            ) {
                              statuses[
                                order.status as keyof typeof statuses
                              ].count += 1;
                            }
                          });
                          return Object.keys(statuses).map((key) => ({
                            name: statuses[key as keyof typeof statuses].label,
                            value: statuses[key as keyof typeof statuses].count,
                            fill: statuses[key as keyof typeof statuses].color,
                          }));
                        })()}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          style={{ fontSize: "13px" }}
                        />
                        <YAxis stroke="#9ca3af" style={{ fontSize: "13px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            padding: "12px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[8, 8, 0, 0]}
                          animationDuration={800}
                        >
                          {(() => {
                            const statuses = {
                              NEW: { count: 0, color: "#fbbf24", label: "New" },
                              COOKING: {
                                count: 0,
                                color: "#f97316",
                                label: "Cooking",
                              },
                              READY: {
                                count: 0,
                                color: "#22c55e",
                                label: "Ready",
                              },
                              PAID: {
                                count: 0,
                                color: "#3b82f6",
                                label: "Paid",
                              },
                            };
                            orders.forEach((order: any) => {
                              if (
                                statuses[order.status as keyof typeof statuses]
                              ) {
                                statuses[
                                  order.status as keyof typeof statuses
                                ].count += 1;
                              }
                            });
                            return Object.keys(statuses).map((key, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  statuses[key as keyof typeof statuses].color
                                }
                              />
                            ));
                          })()}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* All Selling Items - Complete List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <h3 className="text-xl font-bold text-gray-900">
                    All Selling Items
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Ranked by total items sold • {analytics.mostOrdered.length}{" "}
                    items •{" "}
                    {analytics.mostOrdered.reduce(
                      (sum: number, item: any) => sum + item.count,
                      0
                    )}{" "}
                    total items sold
                  </p>
                </div>

                <div className="p-6 max-h-[600px] overflow-y-auto">
                  <div className="space-y-3">
                    {(() => {
                      // Calculate total items sold
                      const totalItemsSold = analytics.mostOrdered.reduce(
                        (sum: number, item: any) => sum + item.count,
                        0
                      );

                      return analytics.mostOrdered.map(
                        (item: any, idx: number) => {
                          const percentage =
                            totalItemsSold > 0
                              ? ((item.count / totalItemsSold) * 100).toFixed(1)
                              : 0;

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                            >
                              {/* Rank Badge */}
                              <div
                                className={`
                              w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg shrink-0
                              ${
                                idx === 0
                                  ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300"
                                  : idx === 1
                                  ? "bg-gray-200 text-gray-700 ring-2 ring-gray-300"
                                  : idx === 2
                                  ? "bg-orange-100 text-orange-700 ring-2 ring-orange-300"
                                  : "bg-blue-50 text-blue-600 border-2 border-blue-200"
                              }
                            `}
                              >
                                #{idx + 1}
                              </div>

                              {/* Item Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-bold text-gray-900 truncate">
                                  {item.name}
                                </h4>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-sm text-gray-500">
                                    Category: {item.category || "General"}
                                  </span>
                                </div>
                              </div>

                              {/* Numbers */}
                              <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900">
                                    {item.count}
                                  </p>
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                                    Items Sold
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-600">
                                    {percentage}%
                                  </p>
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                                    Of Total
                                  </p>
                                </div>

                                {/* Visual Progress */}
                                <div className="w-32">
                                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-1000 ${
                                        idx === 0
                                          ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                                          : idx === 1
                                          ? "bg-gradient-to-r from-gray-400 to-gray-600"
                                          : idx === 2
                                          ? "bg-gradient-to-r from-orange-400 to-orange-600"
                                          : "bg-gradient-to-r from-blue-400 to-blue-600"
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Codes Tab */}
          {activeTab === "qr" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">QR Codes</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Permanent links for customer ordering
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {qrCodes.map((qr) => (
                  <div
                    key={qr.table}
                    className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Table {qr.table}
                        </h3>
                        <a
                          href={qr.url}
                          target="_blank"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {qr.url}
                        </a>
                      </div>
                      <button
                        onClick={() => window.open(qr.url, "_blank")}
                        className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition whitespace-nowrap"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Menu Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Menu Item
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleUpdateMenu}
              className="flex-1 overflow-y-auto p-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.itemNumber}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        itemNumber: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name (Nepali)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.name_ne}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        name_ne: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name (Japanese)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.name_ja}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        name_ja: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (¥)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.imageUrl}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        imageUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prep Station
                  </label>
                  <select
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingItem.prepStation}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        prepStation: e.target.value,
                      })
                    }
                  >
                    <option value="kitchen">Kitchen</option>
                    <option value="bar">Bar</option>
                    <option value="pizza">Pizza</option>
                    <option value="grill">Grill</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
