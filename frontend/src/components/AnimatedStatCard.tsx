"use client";

import React, { useEffect, useState } from 'react';

interface AnimatedStatCardProps {
  icon: string;
  label: string;
  value: number | string;
  suffix?: string;
  trend?: number;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
}

export default function AnimatedStatCard({
  icon,
  label,
  value,
  suffix = '',
  trend,
  gradientFrom,
  gradientTo,
  delay = 0
}: AnimatedStatCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (typeof value === 'number' && isVisible) {
      const duration = 1500;
      const steps = 60;
      const stepValue = value / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += stepValue;
        if (current >= value) {
          setAnimatedValue(value);
          clearInterval(interval);
        } else {
          setAnimatedValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }
  }, [value, isVisible]);

  return (
    <div
      className={`
        bg-gradient-to-br ${gradientFrom} ${gradientTo}
        rounded-3xl p-8 text-white shadow-xl
        relative overflow-hidden group
        transform transition-all duration-500
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        hover:scale-105 hover:shadow-2xl
      `}
    >
      {/* Animated background circles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      
      <div className="relative z-10">
        {/* Icon and badge */}
        <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors duration-300">
            <span className="text-4xl">{icon}</span>
          </div>
          {trend !== undefined && (
            <div className={`
              px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border
              ${trend >= 0 
                ? 'bg-green-500/20 border-green-300/30 text-green-100' 
                : 'bg-red-500/20 border-red-300/30 text-red-100'
              }
            `}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </div>
          )}
        </div>

        {/* Label */}
        <p className="text-sm font-medium mb-2 uppercase tracking-wider opacity-90">
          {label}
        </p>

        {/* Animated value */}
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-bold tracking-tight">
            {typeof value === 'number' 
              ? animatedValue.toLocaleString() 
              : value
            }
          </p>
          {suffix && (
            <span className="text-2xl font-medium opacity-75">{suffix}</span>
          )}
        </div>

        {/* Decorative line */}
        <div className="mt-6 h-1 w-full bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/60 rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: isVisible ? '100%' : '0%',
              transitionDelay: `${delay}ms`
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
