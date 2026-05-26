import { forwardRef } from "react";

export const MenuPanel = forwardRef(function MenuPanel({ children, className = "", title = null, subtitle = null }, ref) {
  return (
    <section ref={ref} className={`mx-auto w-[94%] overflow-hidden rounded-[1.6rem] border border-[#F5F1E8]/12 bg-[#0B5F35]/72 text-[#F5F1E8] shadow-[0_10px_26px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/35 backdrop-blur-[1px] ${className}`}>
      {(title || subtitle) && (
        <div className="px-5 pb-2 pt-4 text-center">
          {title && <div className="home-copy-bold text-[25px] uppercase leading-none tracking-[0.06em] text-[#F5F1E8]">{title}</div>}
          {subtitle && <div className="home-copy-regular mt-2 text-[10px] uppercase tracking-[0.16em] text-[#F5F1E8]/72">{subtitle}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

export function IvoryCard({ children, className = "" }) {
  return <div className={`rounded-[1.2rem] border border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-1 ring-[#F5F1E8]/18 shadow-[0_8px_18px_rgba(0,0,0,0.10)] ${className}`}>{children}</div>;
}

export function UserHighlightCard({ children, className = "" }) {
  return <div className={`rounded-[1.2rem] border border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#0B5F35]/45 shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)] ${className}`}>{children}</div>;
}
