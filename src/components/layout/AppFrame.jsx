export function AppFrame({ children, className = "" }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#F5F0E6] antialiased">
      <div className={`relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#0d6c3d] text-[#F5F1E8] ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function AppFrameContent({ children, className = "" }) {
  return (
    <div className={`relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
