import React from 'react';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface AppleSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function AppleSegmentedControl<T extends string>({
  options,
  activeId,
  onChange,
  className = '',
}: AppleSegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center p-1 bg-black/[0.05] backdrop-blur-2xl border border-black/[0.06] rounded-2xl gap-1 ${className}`}
    >
      {options.map((opt) => {
        const isActive = activeId === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer select-none ${
              isActive
                ? 'bg-white text-[#1d1d1f] shadow-sm border border-black/[0.04] font-semibold'
                : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.03]'
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? 'text-[#0071e3]' : 'text-[#86868b]'
                }`}
              />
            )}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive
                    ? 'bg-black/[0.08] text-[#1d1d1f]'
                    : 'bg-black/[0.04] text-[#86868b]'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
