"use client";

import React from 'react';

interface CircularProgressProps {
  value: number;
  maxValue: number;
  label: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export default function CircularProgress({ 
  value, 
  maxValue, 
  label, 
  color,
  size = 120,
  strokeWidth = 8
}: CircularProgressProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${color}40)`
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">of {maxValue}</span>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(0)}% complete</p>
      </div>
    </div>
  );
}
