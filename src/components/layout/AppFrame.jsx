import { footerAwareStyle } from '../ui/AppFooter.jsx';

export function AppFrame({ children, className = "" }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#0d6c3d] antialiased mc-bleed-visible">
      <div className={`relative flex h-[100dvh] w-full max-w-md flex-col overflow-visible bg-[#0d6c3d] text-[#F5F1E8] ${className}`}>
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
