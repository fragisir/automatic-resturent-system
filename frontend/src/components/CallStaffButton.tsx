'use client';

import React, { useState, useEffect } from 'react';
import { createStaffCall } from '@/lib/firebase';

interface CallStaffButtonProps {
  tableNumber: number;
  isCalling: boolean;
  onCallCreated?: () => void;
}

export default function CallStaffButton({ tableNumber, isCalling, onCallCreated }: CallStaffButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isNotified, setIsNotified] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => {
        setCooldownTime(cooldownTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldownTime === 0 && isNotified) {
      setIsNotified(false);
    }
  }, [cooldownTime, isNotified]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleCallStaff = async () => {
    if (isCalling || isLoading || cooldownTime > 0) return;
    
    setIsLoading(true);
    try {
      await createStaffCall(tableNumber);
      
      // Success: Show confirmation and start cooldown
      setIsNotified(true);
      setShowToast(true);
      setCooldownTime(120); // 2 minutes = 120 seconds
      
      onCallCreated?.();
    } catch (error) {
      console.error('Failed to call staff:', error);
      alert('Failed to call staff. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // format time

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonContent = () => {
    if (cooldownTime > 0) {
      return (
        <>
          <span className="inline-block mr-2">⏳</span>
          Staff Notified
        </>
      );
    }
    
    if (isCalling) {
      return (
        <>
          <span className="inline-block mr-2 animate-bounce">🔔</span>
          Staff is on the way
        </>
      );
    }
    
    if (isLoading) {
      return (
        <>
          <span className="inline-block mr-2 animate-spin">⏳</span>
          Sending...
        </>
      );
    }
    
    return (
      <>
        <span className="inline-block mr-2">🛎️</span>
        Call Staff
      </>
    );
  };

  const getButtonStyle = () => {
    if (cooldownTime > 0) {
      return 'bg-gray-400 cursor-not-allowed';
    }
    
    if (isCalling || isNotified) {
      return 'bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse';
    }
    
    return 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-xl hover:scale-105 active:scale-95';
  };

  return (
    <>
      {/* Call Staff Button */}
      <div className="relative">
        <button
          onClick={handleCallStaff}
          disabled={isCalling || isLoading || cooldownTime > 0}
          className={`
            relative px-8 py-4 rounded-2xl font-bold text-white shadow-lg
            transition-all duration-300 transform
            ${getButtonStyle()}
            ${cooldownTime > 0 ? 'opacity-60' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="text-lg">{getButtonContent()}</div>
            
            {/* Countdown Timer */}
            {cooldownTime > 0 && (
              <div className="text-xs opacity-90 font-normal animate-pulse">
                You can call again in {formatTime(cooldownTime)}
              </div>
            )}
          </div>
          
          {/* Success Checkmark Animation */}
          {isNotified && cooldownTime > 115 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-ping opacity-75">
                <span className="text-3xl">✓</span>
              </div>
            </div>
          )}
          
          {/* Calling Indicator */}
          {isCalling && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-400 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      {/* Confirmation Toast Popup */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-xl font-bold">✓</span>
            </div>
            <div>
              <p className="font-bold text-base">Request Sent Successfully!</p>
              <p className="text-sm opacity-90">A staff member will assist you shortly.</p>
            </div>
            <button 
              onClick={() => setShowToast(false)}
              className="ml-2 text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
