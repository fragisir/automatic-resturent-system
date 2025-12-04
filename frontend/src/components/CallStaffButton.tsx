'use client';

import React, { useState } from 'react';
import { createStaffCall } from '@/lib/firebase';

interface CallStaffButtonProps {
  tableNumber: number;
  isCalling: boolean;
  onCallCreated?: () => void;
}

export default function CallStaffButton({ tableNumber, isCalling, onCallCreated }: CallStaffButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCallStaff = async () => {
    if (isCalling || isLoading) return;
    
    setIsLoading(true);
    try {
      await createStaffCall(tableNumber);
      onCallCreated?.();
    } catch (error) {
      console.error('Failed to call staff:', error);
      alert('Failed to call staff. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCallStaff}
      disabled={isCalling || isLoading}
      className={`
        relative px-6 py-3 rounded-full font-bold text-white shadow-lg
        transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
        ${isCalling 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse' 
          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-xl'
        }
      `}
    >
      {isCalling ? (
        <>
          <span className="inline-block mr-2 animate-bounce">🔔</span>
          Staff Coming...
        </>
      ) : isLoading ? (
        <>
          <span className="inline-block mr-2 animate-spin">⏳</span>
          Calling...
        </>
      ) : (
        <>
          <span className="inline-block mr-2">🙋</span>
          Call Staff
        </>
      )}
      
      {isCalling && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></span>
      )}
    </button>
  );
}
