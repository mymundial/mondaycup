import { forwardRef } from "react";
import { MC_SIZES, MC_TYPE, mcSoftPanelStyle } from "../../styles/theme.js";

export const MenuPanel = forwardRef(function MenuPanel({ children, className = "", title = null, subtitle = null, style = {} }, ref) {
  return (
    <section
      ref={ref}
      className={`mx-auto w-[94%] overflow-hidden text-[#F5F1E8] ${className}`}
      style={{
        borderRadius: MC_SIZES.panelRadius,
        ...mcSoftPanelStyle,
        ...style,
      }}
    >
      {(title || subtitle) && (
        <div className="px-5 pb-2 pt-4 text-center">
          {title && <div className="home-copy-bold text-[25px] uppercase leading-none tracking-[0.06em] text-[#F5F1E8]" style={MC_TYPE.title}>{title}</div>}
          {subtitle && <div className="home-copy-regular mt-2 text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/72">{subtitle}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

export function IvoryCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[1.2rem] text-[#F5F1E8] ${className}`}
      style={{
        border: '1px solid rgba(245,241,232,0.14)',
        background: 'rgba(5,45,29,0.68)',
        boxShadow: '0 6px 14px rgba(0,0,0,0.12), inset 0 1px 0 rgba(245,241,232,0.06)',
      }}
    >
      {children}
    </div>
  );
}

export function UserHighlightCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-[1.2rem] text-[#F5F1E8] ${className}`}
      style={{
        border: '1px solid rgba(247,209,23,0.72)',
        background: 'rgba(5,45,29,0.84)',
        boxShadow: '0 0 12px rgba(247,209,23,0.12), 0 8px 18px rgba(0,0,0,0.14), inset 0 1px 0 rgba(245,241,232,0.08)',
        outline: '1px solid rgba(247,209,23,0.32)',
      }}
    >
      {children}
    </div>
  );
}
