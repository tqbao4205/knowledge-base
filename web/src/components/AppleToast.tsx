import React, { useEffect, useRef, useState } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface AppleToastProps {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
  duration?: number; // default: 4000ms
}

export const AppleToast: React.FC<AppleToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 4000,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restart timer when message changes
  useEffect(() => {
    if (!message) {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      return;
    }

    remainingTimeRef.current = duration;
    startTimeRef.current = Date.now();
    setIsPaused(false);

    if (timerIdRef.current) clearTimeout(timerIdRef.current);

    timerIdRef.current = setTimeout(() => {
      onCloseRef.current();
    }, duration);

    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
    };
  }, [message, duration]);

  // Handle hover pause & resume
  const handleMouseEnter = () => {
    if (!message) return;
    setIsPaused(true);
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    if (!message) return;
    setIsPaused(false);
    startTimeRef.current = Date.now();
    timerIdRef.current = setTimeout(() => {
      onCloseRef.current();
    }, Math.max(1000, remainingTimeRef.current));
  };

  if (!message) return null;

  const typeConfig = {
    success: {
      barColor: 'bg-[#16a34a]',
      borderLeft: 'border-l-[5px] border-[#16a34a]',
      icon: (
        <div className="w-6 h-6 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      ),
    },
    warning: {
      barColor: 'bg-[#f59e0b]',
      borderLeft: 'border-l-[5px] border-[#f59e0b]',
      icon: (
        <div className="w-6 h-6 rounded-full bg-[#f59e0b] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 fill-white text-[#f59e0b]" />
        </div>
      ),
    },
    error: {
      barColor: 'bg-[#ef4444]',
      borderLeft: 'border-l-[5px] border-[#ef4444]',
      icon: (
        <div className="w-6 h-6 rounded-full bg-[#ef4444] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
          <X className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      ),
    },
    info: {
      barColor: 'bg-[#0071e3]',
      borderLeft: 'border-l-[5px] border-[#0071e3]',
      icon: (
        <div className="w-6 h-6 rounded-full bg-[#0071e3] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
          <Info className="w-3.5 h-3.5" />
        </div>
      ),
    },
  };

  const currentConfig = typeConfig[type] || typeConfig.success;

  return (
    <div
      className="fixed top-6 right-6 z-[100] pointer-events-auto w-[360px] max-w-[calc(100vw-3rem)] animate-mac-notification"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`bg-white rounded-xl shadow-xl border border-gray-100/90 overflow-hidden transition-all ${currentConfig.borderLeft}`}
      >
        {/* Toast Body */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
          {/* Status Icon */}
          {currentConfig.icon}

          {/* Message Text */}
          <p className="text-[13px] sm:text-sm font-medium text-[#374151] flex-1 leading-snug break-words select-none">
            {message}
          </p>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Countdown Progress Bar */}
        <div className="h-[3px] w-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full ${currentConfig.barColor} transition-all`}
            style={{
              animation: `shrinkWidth ${duration}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      </div>
    </div>
  );
};
