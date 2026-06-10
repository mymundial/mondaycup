import { footerAwareStyle } from '../ui/AppFooter.jsx';
import { mcExtendedPitchMowBackground } from '../../styles/theme.js';

export function AppFrame({ children, className = "" }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center antialiased" style={mcExtendedPitchMowBackground}>
      <div className={`relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-x border-black bg-[#0d6c3d] text-[#F5F1E8] shadow-[-28px_0_42px_rgba(0,0,0,0.44),28px_0_42px_rgba(0,0,0,0.44),-7px_0_16px_rgba(0,0,0,0.34),7px_0_16px_rgba(0,0,0,0.34)] ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function AppFrameContent({ children, className = "", footerAware = true, style }) {
  return (
    <div
      className={`relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden ${className}`}
      style={footerAware ? footerAwareStyle(style, 'content') : style}
    >
      {children}
    </div>
  );
}
