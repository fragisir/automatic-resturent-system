"use client";

import { useEffect, useState } from "react";

export default function ThankYouOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger animation immediately
    setTimeout(() => setShow(true), 0);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className={`transform transition-all duration-700 ${
          show ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-12 rounded-3xl shadow-2xl text-white text-center max-w-md mx-4">
          {/* Animated Checkmark */}
          <div className="mb-6 relative">
            <div
              className={`w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center transform transition-all duration-500 delay-200 ${
                show ? "scale-100 rotate-0" : "scale-0 rotate-180"
              }`}
            >
              <svg
                className="w-16 h-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                  className={`transition-all duration-700 delay-500 ${
                    show ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: show ? 0 : 30,
                  }}
                />
              </svg>
            </div>
            {/* Pulse rings */}
            <div
              className={`absolute inset-0 w-24 h-24 mx-auto bg-white rounded-full animate-ping opacity-20 ${
                show ? "block" : "hidden"
              }`}
              style={{ animationDuration: "2s" }}
            ></div>
          </div>

          {/* Thank You Text */}
          <div
            className={`transform transition-all duration-500 delay-300 ${
              show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h1 className="text-4xl font-black mb-3">Thank You!</h1>
            <p className="text-xl font-medium text-green-50 mb-2">
              Payment Received
            </p>
            <p className="text-sm text-green-100">
              We hope you enjoyed your meal
            </p>
          </div>

          {/* Sparkle effects */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 bg-white rounded-full ${
                  show ? "animate-sparkle" : "opacity-0"
                }`}
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes sparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0) translateY(0);
          }
          50% {
            opacity: 1;
            transform: scale(1) translateY(-20px);
          }
        }
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
