import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

export default function LoadingOverlay({ message = "Refreshing your session..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
        <div className="mb-4">
          <div className="inline-block">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{message}</h3>
        <p className="text-sm text-gray-500">Please wait a moment...</p>
      </div>
    </div>
  );
}
