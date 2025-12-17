"use client";

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

interface AnalyticsChartsProps {
  analytics: any;
  orders: any[];
}
// hourly data for revenue trend

export default function AnalyticsCharts({ analytics, orders }: AnalyticsChartsProps) {
  // Process hourly data for revenue trend
  const hourlyData = React.useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({
      hour: `${i}:00`,
      orders: 0,
      revenue: 0
    }));
 // calculate hourly data for revenue trend
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hours[hour].orders += 1;
      const total = order.items.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0);
      hours[hour].revenue += total;
    });

    return hours;
  }, [orders]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-lg border border-gray-200 rounded-xl p-4 shadow-xl">
          <p className="font-bold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={hourlyData}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="hour" 
          stroke="#9ca3af" 
          style={{ fontSize: '12px' }}
          interval={2}
        />
        <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#3b82f6" 
          strokeWidth={3}
          fill="url(#colorRevenue)" 
          animationDuration={1000}
          name="Revenue"
        />
        <Area 
          type="monotone" 
          dataKey="orders" 
          stroke="#8b5cf6" 
          strokeWidth={3}
          fill="url(#colorOrders)" 
          animationDuration={1000}
          name="Orders"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
