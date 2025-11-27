"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000');

interface OrderItem {
  itemNumber: number;
  name: string;
  quantity: number;
}

interface Order {
  _id: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'NEW' | 'COOKING' | 'READY' | 'PAID';
  createdAt: string;
}

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Fetch initial orders
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        // Filter out PAID orders for KDS
        setOrders(res.data.filter((o: Order) => o.status !== 'PAID'));
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    };

    fetchOrders();

    // Poll every 5 seconds for synchronization
    const interval = setInterval(fetchOrders, 5000);

    // Join kitchen room
    socket.emit('join_kitchen');

    // Listen for new orders - with deduplication
    socket.on('new_order', (newOrder: Order) => {
      setOrders(prev => {
        // Check if order already exists
        const exists = prev.find(o => o._id === newOrder._id);
        if (exists) {
          return prev; // Don't add duplicate
        }
        return [newOrder, ...prev]; // Add to top
      });
    });

    // Listen for status updates (from other KDS screens or Admin)
    socket.on('order_status_updated', (updatedOrder: Order) => {
      setOrders(prev => {
        if (updatedOrder.status === 'PAID') {
          // Remove paid orders from KDS
          return prev.filter(o => o._id !== updatedOrder._id);
        }
        // Update existing order
        const exists = prev.find(o => o._id === updatedOrder._id);
        if (exists) {
          return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
        }
        // Order doesn't exist yet, add it (edge case)
        return [updatedOrder, ...prev];
      });
    });

    return () => {
      clearInterval(interval);
      socket.off('new_order');
      socket.off('order_status_updated');
    };
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      // Optimistic update
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus as any } : o));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const renderOrderCard = (order: Order) => (
    <div key={order._id} className={`bg-white rounded-xl shadow-md overflow-hidden mb-4 border-l-8 ${
      order.status === 'NEW' ? 'border-yellow-400' : 
      order.status === 'COOKING' ? 'border-orange-500' : 'border-green-500'
    }`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
             <h3 className="text-2xl font-black text-gray-800">Table {order.tableNumber}</h3>
             <span className="text-xs font-mono text-gray-400">#{order._id.slice(-4)}</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-600 block">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <ul className="space-y-2">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center text-gray-800 border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                <span className="font-bold text-lg">{item.quantity}x <span className="font-normal">{item.name}</span></span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">#{item.itemNumber}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-2">
          {order.status === 'NEW' && (
            <button 
              className="flex-1 bg-yellow-400 text-yellow-900 font-bold py-3 rounded-lg hover:bg-yellow-500 transition shadow-sm"
              onClick={() => updateStatus(order._id, 'COOKING')}
            >
              Start Cooking
            </button>
          )}
          {order.status === 'COOKING' && (
            <button 
              className="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition shadow-sm"
              onClick={() => updateStatus(order._id, 'READY')}
            >
              Mark Ready
            </button>
          )}
          {order.status === 'READY' && (
            <div className="w-full text-center bg-green-100 text-green-800 py-3 rounded-lg font-bold border border-green-200">
              READY TO SERVE
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Kitchen Display</h1>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-500">
          {orders.length} Active Orders
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-150px)]">
        {/* NEW Orders */}
        <div className="bg-gray-200/50 p-4 rounded-2xl border border-gray-200 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-black text-gray-700 uppercase tracking-wide">New</h2>
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">{orders.filter(o => o.status === 'NEW').length}</span>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {orders.filter(o => o.status === 'NEW').map(renderOrderCard)}
            {orders.filter(o => o.status === 'NEW').length === 0 && (
              <div className="text-center text-gray-400 py-10 italic">No new orders</div>
            )}
          </div>
        </div>

        {/* COOKING Orders */}
        <div className="bg-gray-200/50 p-4 rounded-2xl border border-gray-200 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-black text-gray-700 uppercase tracking-wide">Cooking</h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">{orders.filter(o => o.status === 'COOKING').length}</span>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {orders.filter(o => o.status === 'COOKING').map(renderOrderCard)}
            {orders.filter(o => o.status === 'COOKING').length === 0 && (
              <div className="text-center text-gray-400 py-10 italic">Nothing cooking</div>
            )}
          </div>
        </div>

        {/* READY Orders */}
        <div className="bg-gray-200/50 p-4 rounded-2xl border border-gray-200 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-black text-gray-700 uppercase tracking-wide">Ready</h2>
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{orders.filter(o => o.status === 'READY').length}</span>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {orders.filter(o => o.status === 'READY').map(renderOrderCard)}
            {orders.filter(o => o.status === 'READY').length === 0 && (
              <div className="text-center text-gray-400 py-10 italic">No ready orders</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
