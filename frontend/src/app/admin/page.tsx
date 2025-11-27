"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000');

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('orders');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [qrCodes, setQrCodes] = useState<{table: number, url: string}[]>([]);
  
  const [newItem, setNewItem] = useState({
    itemNumber: '', name: '', price: '', category: '', imageUrl: '', prepStation: 'kitchen'
  });
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    } else {
      fetchData();
    }
  }, [activeTab, router]);

  useEffect(() => {
    socket.on('new_order', (order: any) => {
      setOrders(prev => [order, ...prev]);
      if (activeTab === 'analytics') fetchAnalytics();
    });

    socket.on('order_status_updated', (updatedOrder: any) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      if (activeTab === 'analytics') fetchAnalytics();
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
    };
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    }
  };

  const fetchData = async () => {
    if (activeTab === 'menu') {
      const res = await api.get('/menu');
      setMenuItems(res.data);
    } else if (activeTab === 'orders') {
      const res = await api.get('/orders');
      setOrders(res.data);
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'qr') {
      const res = await api.get('/admin/qr-codes');
      setQrCodes(res.data);
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/menu', newItem);
      setNewItem({ itemNumber: '', name: '', price: '', category: '', imageUrl: '', prepStation: 'kitchen' });
      fetchData();
    } catch (err) {
      alert('Failed to add item');
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (confirm('Delete this item?')) {
      await api.delete(`/menu/${id}`);
      fetchData();
    }
  };

  const handleEditMenu = (item: any) => {
    setEditingItem({
      _id: item._id,
      itemNumber: item.itemNumber.toString(),
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      prepStation: item.prepStation
    });
    setShowEditModal(true);
  };

  const handleUpdateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/menu/${editingItem._id}`, {
        itemNumber: parseInt(editingItem.itemNumber),
        name: editingItem.name,
        price: parseFloat(editingItem.price),
        category: editingItem.category,
        imageUrl: editingItem.imageUrl,
        prepStation: editingItem.prepStation
      });
      setShowEditModal(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      alert('Failed to update item');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    fetchData();
  };

  const menuTabs = [
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'menu', label: 'Menu', icon: '🍽️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'qr', label: 'QR Codes', icon: '📱' }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">EasyOne</h1>
          <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
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
            onClick={() => { localStorage.removeItem('adminToken'); router.push('/admin/login'); }} 
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
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EasyOne Admin</h1>
            <p className="text-sm text-gray-500">Kitchen Management System</p>
          </div>
                <span className="text-sm text-gray-500">
                  {orders.filter(o => o.status !== 'PAID').length} active
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <p className="text-gray-400">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order._id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-lg font-semibold text-gray-900">Table {order.tableNumber}</span>
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                              order.status === 'NEW' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'COOKING' ? 'bg-orange-100 text-orange-800' :
                              order.status === 'READY' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        
                        {order.status !== 'PAID' && (
                          <div className="flex gap-2">
                            {order.status === 'NEW' && (
                              <button 
                                onClick={() => updateStatus(order._id, 'COOKING')} 
                                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition"
                              >
                                Start Cooking
                              </button>
                            )}
                            {order.status === 'COOKING' && (
                              <button 
                                onClick={() => updateStatus(order._id, 'READY')} 
                                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition"
                              >
                                Mark Ready
                              </button>
                            )}
                            <button 
                              onClick={() => updateStatus(order._id, 'PAID')} 
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                              Mark Paid
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-700">
                              <span className="font-medium">{item.quantity}x</span> {item.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
              
              <form onSubmit={handleAddMenu} className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Add New Item</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input placeholder="Item Number" className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newItem.itemNumber} onChange={e => setNewItem({...newItem, itemNumber: e.target.value})} required />
                  <input placeholder="Name" className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                  <input placeholder="Price (¥)" type="number" className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                  <input placeholder="Category" className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} required />
                  <input placeholder="Image URL (optional)" className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newItem.imageUrl} onChange={e => setNewItem({...newItem, imageUrl: e.target.value})} />
                  <select className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newItem.prepStation} onChange={e => setNewItem({...newItem, prepStation: e.target.value})}>
                    <option value="kitchen">Kitchen</option>
                    <option value="bar">Bar</option>
                    <option value="pizza">Pizza</option>
                    <option value="grill">Grill</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-medium">
                  Add Menu Item
                </button>
              </form>

              <div className="grid grid-cols-3 gap-4">
                {menuItems.map(item => (
                  <div key={item._id} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">#{item.itemNumber}</p>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-lg font-bold text-blue-600 mt-1">¥{item.price}</p>
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
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.category}</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{item.prepStation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                  <p className="text-sm text-gray-500 mb-2">Total Orders</p>
                  <p className="text-5xl font-bold text-gray-900">{analytics.ordersCount}</p>
                </div>
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                  <p className="text-sm text-gray-500 mb-2">Total Revenue</p>
                  <p className="text-5xl font-bold text-blue-600">¥{analytics.totalRevenue}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Most Ordered Items</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.mostOrdered.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QR Codes Tab */}
          {activeTab === 'qr' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">QR Codes</h2>
                <p className="text-sm text-gray-500 mt-1">Permanent links for customer ordering</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {qrCodes.map((qr) => (
                  <div key={qr.table} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Table {qr.table}</h3>
                        <a href={qr.url} target="_blank" className="text-sm text-blue-600 hover:underline break-all">
                          {qr.url}
                        </a>
                      </div>
                      <button 
                        onClick={() => window.open(qr.url, '_blank')}
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
                <h2 className="text-2xl font-bold text-gray-900">Edit Menu Item</h2>
                <button
                  onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateMenu} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Number</label>
                  <input 
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={editingItem.itemNumber} 
                    onChange={e => setEditingItem({...editingItem, itemNumber: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input 
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={editingItem.name} 
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (¥)</label>
                  <input 
                    type="number"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={editingItem.price} 
                    onChange={e => setEditingItem({...editingItem, price: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input 
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={editingItem.category} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})} 
                    required 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL (optional)</label>
                  <input 
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={editingItem.imageUrl} 
                    onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prep Station</label>
                  <select 
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={editingItem.prepStation} 
                    onChange={e => setEditingItem({...editingItem, prepStation: e.target.value})}
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
                  onClick={() => { setShowEditModal(false); setEditingItem(null); }}
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
