'use client';

import React, { useEffect, useState } from 'react';
import { listenToStaffCalls, removeStaffCall, StaffCall } from '@/lib/firebase';

export default function StaffCallsPanel() {
  const [calls, setCalls] = useState<Record<string, StaffCall>>({});
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToStaffCalls(
      (activeCalls) => {
        setCalls(activeCalls);
        setError(null);
        
        // Play sound notification when new call arrives
        const callCount = Object.keys(activeCalls).length;
        const prevCount = Object.keys(calls).length;
        if (callCount > prevCount) {
          playNotificationSound();
        }
      },
      (err) => {
        console.error("StaffCallsPanel error:", err);
        setError("Failed to connect to staff calling system");
      }
    );

    return () => unsubscribe();
  }, []);

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
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio notification not available');
    }
  };

  const handleRespond = async (callId: string) => {
    setRespondingTo(callId);
    try {
      await removeStaffCall(callId);
    } catch (error) {
      console.error('Failed to respond to call:', error);
      alert('Failed to respond. Please try again.');
    } finally {
      setRespondingTo(null);
    }
  };

  const getTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const callsArray = Object.entries(calls).sort(([, a], [, b]) => a.timestamp - b.timestamp);

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl shadow-xl p-8 border-2 border-red-200">
        <div className="flex items-center gap-3 text-red-800 mb-2">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-bold">Connection Error</h2>
        </div>
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-red-500 mt-2">Please check your internet connection or Firebase configuration.</p>
      </div>
    );
  }

  if (callsArray.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📞 Staff Calls</h2>
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm">
            All Clear ✓
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😊</div>
          <p className="text-gray-500 font-medium">No active calls</p>
          <p className="text-sm text-gray-400 mt-2">Calls from customers will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-orange-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📞 Staff Calls</h2>
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold text-sm animate-pulse">
          {callsArray.length} Active {callsArray.length === 1 ? 'Call' : 'Calls'}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {callsArray.map(([callId, call]) => (
          <div
            key={callId}
            className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 relative overflow-hidden animate-fadeIn"
          >
            {/* Pulsing background effect */}
            <div className="absolute inset-0 bg-orange-200 opacity-20 animate-pulse"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-orange-600 font-semibold mb-1">Table Number</div>
                  <div className="text-4xl font-black text-orange-700">
                    {call.tableNumber}
                  </div>
                </div>
                <div className="bg-orange-500 text-white p-3 rounded-full animate-bounce">
                  🔔
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4 font-medium">
                ⏱️ {getTimeSince(call.timestamp)}
              </div>

              <button
                onClick={() => handleRespond(callId)}
                disabled={respondingTo === callId}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {respondingTo === callId ? (
                  <>
                    <span className="inline-block mr-2 animate-spin">⏳</span>
                    Responding...
                  </>
                ) : (
                  <>
                    <span className="inline-block mr-2">✓</span>
                    Respond
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
