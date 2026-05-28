import { BrandMark, MondayLogo } from "../shared.jsx";
import { AppFrame, AppFrameContent } from "./AppFrame.jsx";
import { PitchPageBackground } from "./PitchPageBackground.jsx";
import { MC_COLORS, MC_SIZES, mcPanelBorder } from "../../styles/theme.js";

export function Shell({ children }) {
  return <div className="flex min-h-[100dvh] justify-center bg-[#F5F0E6] text-[#072D1D] antialiased"><div className="min-h-[100dvh] w-full max-w-md">{children}</div></div>;
}

export function PageFrame({ children }) {
  return <div className="flex min-h-[100dvh] flex-col overflow-y-auto bg-[#F5F0E6] px-5 pb-0 pt-2">{children}</div>;
}

export function Footer() {
  return <footer className="mt-auto h-[48px] shrink-0 bg-[#F5F0E6] pt-1.5 text-center"><div className="flex h-full items-start justify-center pt-2"><BrandMark /></div></footer>;
}

export function GreenCard({ children, className = "" }) {
  return (
    <section
      className={`text-[#F5F0E6] ${className}`}
      style={{ borderRadius: MC_SIZES.panelRadius, border: mcPanelBorder, background: MC_COLORS.greenPanel, padding: 20 }}
    >
      {children}
    </section>
  );
}

export function Hero() {
  return <div className="flex h-[92px] flex-col items-center justify-center text-center"><div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0B5F35]/45">THE JOURNEY BEGINS</div><div className="mt-2 text-[38px] font-black uppercase leading-[0.9] tracking-[-0.015em] text-[#0B5F35]">CHOOSE A TEAM</div></div>;
}

export function BottomTagline() {
  return <div className="flex flex-1 items-center justify-center pb-2 pt-3 text-center"><p className="inline-block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[#072D1D]/45">PICK A TEAM · TAKE YOUR CHANCES · LIFT THE CUP</p></div>;
}

export function SelectionLayout({ children }) {
  return <Shell><PageFrame><header className="text-center"><div className="flex items-center justify-center pb-1 pt-1 text-center"><p className="inline-block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[#072D1D]/45">PICK A TEAM · TAKE YOUR CHANCES · LIFT THE CUP</p></div><div className="flex justify-center"><MondayLogo /></div><Hero /></header><main className="flex min-h-0 flex-1 flex-col py-1"><div className="mt-3">{children}</div></main><Footer /></PageFrame></Shell>;
}

export { PitchPageBackground };

export function DrawerShell({ children }) {
  return (
    <AppFrame>
      <PitchPageBackground />
      <AppFrameContent>{children}</AppFrameContent>
    </AppFrame>
  );
}
