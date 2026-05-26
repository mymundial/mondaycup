export function ActionButton({ children, onClick, variant = "yellow", className = "", disabled = false, type = "button" }) {
  const variants = {
    yellow: "border-[#F7D117]/75 bg-[#F7D117] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)]",
    dark: "border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/45",
    ivory: "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] shadow-[0_8px_18px_rgba(0,0,0,0.10)] ring-1 ring-[#F5F1E8]/18",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 items-center justify-center rounded-full border px-4 text-center home-copy-bold text-[15px] uppercase tracking-[0.14em] disabled:opacity-70 ${variants[variant] || variants.yellow} ${className}`}
    >
      {children}
    </button>
  );
}
