import React from 'react';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';

export const PAGE_TABS_SLOT_CLASS = 'px-0 pb-2 pt-3';

export function PageTabsSlot({ children, className = '' }) {
  return <div className={`${PAGE_TABS_SLOT_CLASS} ${className}`}>{children}</div>;
}

const SIZE_CONFIG = {
  standard: {
    wrap: 'mx-auto grid w-[94%] rounded-[0.95rem] border border-[#F5F1E8]/20 bg-[#0B5F35]/82 p-0.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.08),0_8px_20px_rgba(0,0,0,0.12)]',
    button: 'h-8 rounded-[0.75rem] px-3 text-[14px] tracking-[0.08em]',
    icon: 'h-[14px] w-[14px]',
  },
  compact: {
    wrap: 'mx-auto grid w-[94%] rounded-[0.9rem] border border-[#F5F1E8]/20 bg-[#0B5F35]/82 p-0.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.08),0_8px_20px_rgba(0,0,0,0.12)]',
    button: 'h-7 rounded-[0.7rem] px-2.5 text-[12px] tracking-[0.08em]',
    icon: 'h-[13px] w-[13px]',
  },
  icon: {
    wrap: 'mx-auto grid w-[76px] rounded-full border border-[#F5F1E8]/18 bg-[#062819]/82 p-[2px] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]',
    button: 'h-[20px] rounded-full px-0 text-[0px] tracking-normal',
    icon: 'h-[14px] w-[14px]',
  },
};

function normaliseOption(option) {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

export default function PageTabs({
  options = [],
  value,
  onChange,
  className = '',
  style,
  activeClassName = '',
  inactiveClassName = '',
  size = 'standard',
  ariaLabel,
}) {
  const safeOptions = options.map(normaliseOption);
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.standard;

  return (
    <div
      className={`${config.wrap} ${className}`}
      style={{ gridTemplateColumns: `repeat(${Math.max(safeOptions.length, 1)}, minmax(0, 1fr))`, ...style }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {safeOptions.map((option) => {
        const active = option.value === value;
        const hasIcon = Boolean(option.iconSrc || option.icon);
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={option.ariaLabel || option.label}
            onClick={() => onChange?.(option.value)}
            className={`flex items-center justify-center home-copy-bold uppercase leading-none transition-all ${config.button} ${active ? `bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.24)] ${activeClassName}` : `bg-transparent text-[#F5F1E8] ${inactiveClassName}`}`}
            style={hasIcon ? undefined : MC_TYPE.label}
          >
            {option.iconSrc ? (
              <img src={option.iconSrc} alt="" className={`${config.icon} object-contain`} draggable={false} />
            ) : option.icon ? (
              option.icon
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
