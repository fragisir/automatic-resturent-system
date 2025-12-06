"use client";

import React from 'react';

interface TablePerformanceProps {
  orders: any[];
}

export default function TablePerformance({ orders }: TablePerformanceProps) {
  const tableStats = React.useMemo(() => {
    const stats: { [key: number]: { orders: number; revenue: number; avgTime: number } } = {};
    
    orders.forEach(order => {
      const table = order.tableNumber;
      if (!stats[table]) {
        stats[table] = { orders: 0, revenue: 0, avgTime: 0 };
      }
      
      stats[table].orders += 1;
      const orderTotal = order.items.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0);
      stats[table].revenue += orderTotal;
    });

    return Object.keys(stats)
      .map(key => ({
        table: parseInt(key),
        ...stats[parseInt(key)]
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  const maxRevenue = tableStats[0]?.revenue || 1;

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Table Performance</h3>
        <p className="text-sm text-gray-500">Revenue and activity by table</p>
      </div>

      <div className="space-y-4">
        {tableStats.slice(0, 10).map((stat, index) => {
          const percentage = (stat.revenue / maxRevenue) * 100;
          
          return (
            <div key={stat.table} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-50' :
                      index === 1 ? 'bg-gray-100 text-gray-700 ring-4 ring-gray-50' :
                      index === 2 ? 'bg-orange-100 text-orange-700 ring-4 ring-orange-50' :
                      'bg-blue-50 text-blue-600'}
                  `}>
                    {stat.table}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Table {stat.table}</p>
                    <p className="text-xs text-gray-500">{stat.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">¥{stat.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">total revenue</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`
                    absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out
                    ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                      'bg-gradient-to-r from-blue-400 to-blue-600'}
                  `}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tableStats.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📊</span>
          <p className="text-gray-500">No table data available yet</p>
        </div>
      )}
    </div>
  );
}
