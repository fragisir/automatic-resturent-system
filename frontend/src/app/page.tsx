"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";
import StaffCallsPanel from "@/components/StaffCallsPanel";

const socket = io(
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace("/api", "") ||
    "http://localhost:5000" //change to your backend url
);

interface Order {
  _id: string;
  tableNumber: number;
  status: "NEW" | "COOKING" | "READY" | "PAID";
}

// table length
export default function Home() {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Fetch active orders
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/orders");
        const orders = await response.json();
        // Filter only non-paid orders
        const active = orders.filter((o: Order) => o.status !== "PAID");
        setActiveOrders(active);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };

    fetchOrders();

    // Poll every 5 seconds to update orders
    const interval = setInterval(fetchOrders, 5000);

    // Socket listeners for real-time updates
    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("new_order", (order: Order) => {
      setActiveOrders((prev) => [...prev, order]);
    });

    socket.on("order_status_updated", (updatedOrder: Order) => {
      if (updatedOrder.status === "PAID") {
        // Remove from active orders when paid
        setActiveOrders((prev) =>
          prev.filter((o) => o._id !== updatedOrder._id)
        );
      } else {
        // Update existing order
        setActiveOrders((prev) => {
          const exists = prev.find((o) => o._id === updatedOrder._id);
          if (exists) {
            return prev.map((o) =>
              o._id === updatedOrder._id ? updatedOrder : o
            );
          }
          return [...prev, updatedOrder];
        });
      }
    });

    return () => {
      clearInterval(interval);
      socket.off("connect");
      socket.off("new_order");
      socket.off("order_status_updated");
    };
  }, []);

  const isTableOccupied = (tableNumber: number) => {
    return activeOrders.some((order) => order.tableNumber === tableNumber);
  };

  const getTableStatus = (tableNumber: number) => {
    const order = activeOrders.find((o) => o.tableNumber === tableNumber);
    if (!order) return "FREE";
    return order.status;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-3">
            Smart Restaurant
          </h1>
          <p className="text-xl text-gray-600">
            Restaurant Order Management System
          </p>
        </div>

        {/* Main Navigation */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Admin Panel */}
          <a
            href="/admin"
            className="block bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-8 rounded-2xl shadow-xl transform transition hover:scale-105"
          >
            <div className="text-5xl mb-4">👨‍💼</div>
            <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>
            <p className="text-blue-100">Manage orders, QR codes & analytics</p>
          </a>

          {/* Kitchen Display */}
          <a
            href="/kds"
            className="block bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white p-8 rounded-2xl shadow-xl transform transition hover:scale-105"
          >
            <div className="text-5xl mb-4">👨‍🍳</div>
            <h2 className="text-2xl font-bold mb-2">Kitchen Display</h2>
            <p className="text-orange-100">View & update order status</p>
          </a>

          {/* POS */}
          <a
            href="/pos"
            className="block bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-8 rounded-2xl shadow-xl transform transition hover:scale-105"
          >
            <div className="text-5xl mb-4">💰</div>
            <h2 className="text-2xl font-bold mb-2">POS System</h2>
            {/* <p className="text-green-100">Process payments & checkout</p> */}
            <p className="text-green-100">Comming Soon...</p>
          </a>
        </div>

        {/* Staff Calls Panel */}
        <StaffCallsPanel />

        {/* Table Links */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Table Status</h2>
              <p className="text-gray-600 mt-1">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Available
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full ml-4 mr-2"></span>
                Occupied
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Active Orders</div>
              <div className="text-3xl font-bold text-red-600">
                {activeOrders.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {tables.map((table) => {
              const occupied = isTableOccupied(table);
              const status = getTableStatus(table);

              return (
                <a
                  key={table}
                  href={`/order?table=${table}`}
                  className={`group relative rounded-xl p-4 text-center transition-all transform hover:scale-110 hover:shadow-lg border-2 ${
                    occupied
                      ? "bg-gradient-to-br from-red-50 to-red-100 border-red-400 hover:from-red-100 hover:to-red-200"
                      : "bg-gradient-to-br from-green-50 to-green-100 border-green-400 hover:from-green-100 hover:to-green-200"
                  }`}
                >
                  <div
                    className={`text-2xl font-black ${
                      occupied ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {table}
                  </div>
                  <div
                    className={`text-xs mt-1 font-semibold ${
                      occupied ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {occupied ? status : "FREE"}
                  </div>
                  {occupied && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </a>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="font-bold text-blue-900 mb-1">
                  Live Status Updates:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Tables turn RED when orders are placed</li>
                  <li>• Status shows: NEW → COOKING → READY</li>
                  <li>• Tables turn GREEN when payment is completed</li>
                  <li>• Updates happen in real-time via WebSocket</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs mt-2">
          reservation system with real-time updates
        </p>
      </div>
    </main>
  );
}
