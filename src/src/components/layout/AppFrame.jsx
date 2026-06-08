import { footerAwareStyle } from '../ui/AppFooter.jsx';
import StadiumContinuation from './StadiumContinuation.jsx';

export function AppFrame({ children, className = "", visualMode = "menu", title = "" }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden bg-[#0d6c3d] antialiased">
      <StadiumContinuation mode={visualMode} title={title} />
      <div className={`relative z-10 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#0d6c3d] text-[#F5F1E8] shadow-[0_0_0_1px_rgba(245,241,232,0.10),0_0_42px_rgba(0,0,0,0.24)] ${className}`}>
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
