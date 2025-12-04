"use client";

import React, { useState, useEffect } from 'react';
import { createStaffCall, listenToStaffCalls, StaffCall } from '@/lib/firebase';

export default function DebugFirebasePage() {
  const [calls, setCalls] = useState<Record<string, StaffCall>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [config, setConfig] = useState<any>({});

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    // Show masked config
    setConfig({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present (Starts with ' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 5) + '...)' : 'MISSING',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING',
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'MISSING',
    });

    addLog("Initializing listener...");
    const unsubscribe = listenToStaffCalls(
      (data) => {
        addLog(`Received ${Object.keys(data).length} calls`);
        setCalls(data);
      },
      (error) => {
        addLog(`ERROR: ${error.message}`);
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleTestCall = async () => {
    try {
      addLog("Attempting to create test call...");
      const id = await createStaffCall(999); // Test table 999
      addLog(`Success! Created call ID: ${id}`);
    } catch (e: any) {
      addLog(`FAILED to create call: ${e.message}`);
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Firebase Debugger</h1>
      
      <div className="grid gap-6">
        {/* Config Section */}
        <div className="bg-gray-100 p-4 rounded-xl">
          <h2 className="font-bold mb-2">Configuration</h2>
          <pre className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button 
            onClick={handleTestCall}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700"
          >
            Test Write (Table 999)
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700"
          >
            Reload Page
          </button>
        </div>

        {/* Active Calls */}
        <div className="bg-white border-2 border-blue-100 p-4 rounded-xl">
          <h2 className="font-bold mb-2">Active Calls (Realtime)</h2>
          {Object.keys(calls).length === 0 ? (
            <p className="text-gray-500">No calls found.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(calls).map(([id, call]) => (
                <li key={id} className="bg-blue-50 p-2 rounded flex justify-between">
                  <span>Table {call.tableNumber}</span>
                  <span className="text-xs text-gray-500">{new Date(call.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Logs */}
        <div className="bg-black text-white p-4 rounded-xl h-64 overflow-y-auto font-mono text-sm">
          <h2 className="font-bold text-gray-400 mb-2 sticky top-0 bg-black">Logs</h2>
          {logs.map((log, i) => (
            <div key={i} className="border-b border-gray-800 py-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
