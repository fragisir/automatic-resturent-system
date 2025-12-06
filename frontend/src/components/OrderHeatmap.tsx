"use client";

import React from 'react';

interface HeatmapProps {
  orders: any[];
}

export default function OrderHeatmap({ orders }: HeatmapProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Create heatmap data
  const heatmapData = React.useMemo(() => {
    const data: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const day = (date.getDay() + 6) % 7; // Convert to Monday = 0
      const hour = date.getHours();
      data[day][hour] += 1;
    });
    
    return data;
  }, [orders]);

  // Find max value for color scaling
  const maxOrders = Math.max(...heatmapData.flat());

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    const intensity = (value / maxOrders);
    
    if (intensity < 0.2) return 'bg-blue-200';
    if (intensity < 0.4) return 'bg-blue-300';
    if (intensity < 0.6) return 'bg-blue-400';
    if (intensity < 0.8) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  const getTextColor = (value: number) => {
    const intensity = (value / maxOrders);
    return intensity > 0.5 ? 'text-white' : 'text-gray-700';
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Order Heatmap</h3>
        <p className="text-sm text-gray-500">Busiest hours and days</p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hours header */}
          <div className="flex mb-2">
            <div className="w-12"></div>
            <div className="flex-1 grid grid-cols-24 gap-1">
              {hours.map(hour => (
                <div key={hour} className="text-center">
                  <span className="text-[10px] text-gray-500">
                    {hour % 3 === 0 ? hour : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap grid */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex mb-1">
              <div className="w-12 flex items-center">
                <span className="text-xs font-medium text-gray-600">{day}</span>
              </div>
              <div className="flex-1 grid grid-cols-24 gap-1">
                {hours.map(hour => {
                  const value = heatmapData[dayIndex][hour];
                  return (
                    <div
                      key={hour}
                      className={`
                        ${getColor(value)}
                        ${getTextColor(value)}
                        aspect-square rounded flex items-center justify-center
                        text-[10px] font-bold transition-all duration-200
                        hover:scale-110 hover:shadow-lg cursor-pointer
                      `}
                      title={`${day} ${hour}:00 - ${value} orders`}
                    >
                      {value > 0 ? value : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-xs text-gray-600 font-medium">Less</span>
            <div className="flex gap-1">
              {['bg-gray-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600'].map((color, i) => (
                <div key={i} className={`w-6 h-6 ${color} rounded`}></div>
              ))}
            </div>
            <span className="text-xs text-gray-600 font-medium">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
