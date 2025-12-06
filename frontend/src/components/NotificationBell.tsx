"use client";

import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'order' | 'status' | 'stats';
  timestamp: Date;
  tableNumber?: number;
  status?: string;
  read: boolean;
  uniqueKey: string; // Unique identifier to track if notification was cleared
}

interface NotificationBellProps {
  orders: any[];
}

export default function NotificationBell({ orders }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [clearedNotifications, setClearedNotifications] = useState<Set<string>>(new Set());

  // Load cleared notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('clearedNotifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClearedNotifications(new Set(parsed));
      } catch (e) {
        console.error('Failed to load cleared notifications');
      }
    }
  }, []);

  // Save cleared notifications to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('clearedNotifications', JSON.stringify(Array.from(clearedNotifications)));
  }, [clearedNotifications]);

  // Check for changes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, 5000);

    return () => clearInterval(interval);
  }, [orders]);

  // Immediate check when orders change
  useEffect(() => {
    checkForUpdates();
  }, [orders]);

  const checkForUpdates = () => {
    const currentOrderCount = orders.length;
    const currentPendingCount = orders.filter(o => o.status !== 'PAID').length;
    const now = new Date();

    // Check for new orders
    if (currentOrderCount > previousOrderCount) {
      const newOrders = orders.slice(0, currentOrderCount - previousOrderCount);
      newOrders.forEach(order => {
        const uniqueKey = `order-${order._id}`;
        if (!clearedNotifications.has(uniqueKey)) {
          addNotification({
            message: `New order from Table ${order.tableNumber}`,
            type: 'order',
            tableNumber: order.tableNumber,
            status: order.status,
            uniqueKey,
          });
        }
      });
    }

    // Check for status changes
    orders.forEach(order => {
      const orderTime = new Date(order.updatedAt || order.createdAt);
      if (orderTime > lastChecked) {
        // Check if this is a status update (not a new order)
        const isOldOrder = new Date(order.createdAt) < lastChecked;
        if (isOldOrder) {
          const uniqueKey = `status-${order._id}-${order.status}`;
          if (!clearedNotifications.has(uniqueKey)) {
            let statusMessage = '';
            switch (order.status) {
              case 'COOKING':
                statusMessage = `Table ${order.tableNumber} - Order is now cooking 🔥`;
                break;
              case 'READY':
                statusMessage = `Table ${order.tableNumber} - Order is ready ✅`;
                break;
              case 'PAID':
                statusMessage = `Table ${order.tableNumber} - Payment completed 💳`;
                break;
              case 'NEW':
                statusMessage = `Table ${order.tableNumber} - New order received 📋`;
                break;
            }
            if (statusMessage) {
              addNotification({
                message: statusMessage,
                type: 'status',
                tableNumber: order.tableNumber,
                status: order.status,
                uniqueKey,
              });
            }
          }
        }
      }
    });

    // Check for pending orders change
    if (previousPendingCount !== 0 && currentPendingCount !== previousPendingCount) {
      const diff = currentPendingCount - previousPendingCount;
      const uniqueKey = `stats-pending-${currentPendingCount}-${Date.now()}`;
      if (!clearedNotifications.has(uniqueKey)) {
        addNotification({
          message: `Pending Orders: ${currentPendingCount} (${diff > 0 ? '+' : ''}${diff})`,
          type: 'stats',
          uniqueKey,
        });
      }
    }

    // Check for total orders change
    if (previousOrderCount !== 0 && currentOrderCount !== previousOrderCount) {
      const uniqueKey = `stats-total-${currentOrderCount}-${Date.now()}`;
      if (!clearedNotifications.has(uniqueKey)) {
        addNotification({
          message: `Total Orders: ${currentOrderCount} (${currentOrderCount > previousOrderCount ? '+' : ''}${currentOrderCount - previousOrderCount})`,
          type: 'stats',
          uniqueKey,
        });
      }
    }

    setPreviousOrderCount(currentOrderCount);
    setPreviousPendingCount(currentPendingCount);
    setLastChecked(now);
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
    
    // Play notification sound (optional)
    playNotificationSound();
  };

  const playNotificationSound = () => {
    // Create a simple beep sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio context might not be available, silently fail
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    // Add all current notification unique keys to the cleared set
    const newCleared = new Set(clearedNotifications);
    notifications.forEach(notification => {
      newCleared.add(notification.uniqueKey);
    });
    setClearedNotifications(newCleared);
    
    // Clear the notifications display
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string, status?: string) => {
    if (type === 'order') return '🔔';
    if (type === 'stats') return '📊';
    if (type === 'status') {
      switch (status) {
        case 'COOKING': return '🔥';
        case 'READY': return '✅';
        case 'PAID': return '💳';
        case 'NEW': return '📋';
        default: return '🔔';
      }
    }
    return '🔔';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'NEW': return 'bg-yellow-100 text-yellow-700';
      case 'COOKING': return 'bg-orange-100 text-orange-700';
      case 'READY': return 'bg-green-100 text-green-700';
      case 'PAID': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-3 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-200 shadow-lg group"
        aria-label="Notifications"
      >
        <svg
          className={`w-6 h-6 text-gray-700 ${unreadCount > 0 ? 'animate-[wiggle_0.5s_ease-in-out]' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col overflow-hidden animate-[slideDown_0.2s_ease-out]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                <span className="text-sm text-gray-500">{notifications.length} total</span>
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 font-medium hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 font-medium hover:text-red-700"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-3">🔔</div>
                  <p className="text-gray-500 font-medium">No notifications yet</p>
                  <p className="text-sm text-gray-400 mt-1">You'll be notified of new orders and updates</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl mt-0.5">
                          {getNotificationIcon(notification.type, notification.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400">
                              {formatTimeAgo(notification.timestamp)}
                            </p>
                            {notification.status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(notification.status)}`}>
                                {notification.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Total Orders:</span>
                  <span className="font-bold text-gray-900">{orders.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-orange-600">Pending:</span>
                  <span className="font-bold text-orange-700">
                    {orders.filter(o => o.status !== 'PAID').length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Updates every 5s</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
