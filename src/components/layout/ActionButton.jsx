import { MC_COLORS } from "../../styles/theme.js";
import YellowButton from "../ui/YellowButton.jsx";

export function ActionButton({ children, onClick, variant = "yellow", className = "", disabled = false, type = "button" }) {
  const mappedVariant = variant === "dark" ? "dark" : variant === "danger" || variant === "red" ? "red" : "yellow";
  const ivoryStyle = variant === "ivory" ? { background: MC_COLORS.ivory, color: MC_COLORS.greenDark } : null;
  return (
    <YellowButton
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={mappedVariant}
      className={className}
      style={{ minHeight: 44, fontSize: 15, letterSpacing: '0.14em', border: '1px solid rgba(247,209,23,0.55)', ...ivoryStyle }}
    >
      {children}
    </YellowButton>
  );
}
