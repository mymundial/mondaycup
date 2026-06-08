import { MondayLogo } from "../shared.jsx";
import { AppFrame, AppFrameContent } from "./AppFrame.jsx";
import { PitchPageBackground } from "./PitchPageBackground.jsx";
import AppFooter from "../ui/AppFooter.jsx";
import AppPanel from "../ui/AppPanel.jsx";
import StadiumContinuation from "./StadiumContinuation.jsx";

export function Shell({ children, visualMode = "menu", title = "" }) {
  return (
    <div className="relative flex min-h-[100dvh] justify-center overflow-hidden bg-[#0d6c3d] text-[#072D1D] antialiased">
      <StadiumContinuation mode={visualMode} title={title} />
      <div className="relative z-10 min-h-[100dvh] w-full max-w-md shadow-[0_0_0_1px_rgba(245,241,232,0.10),0_0_42px_rgba(0,0,0,0.24)]">{children}</div>
    </div>
  );
}

export function PageFrame({ children }) {
  return <div className="flex min-h-[100dvh] flex-col overflow-y-auto bg-transparent px-5 pb-0 pt-2">{children}</div>;
}

export function Footer() {
  return <AppFooter />;
}

export function GreenCard({ children, className = "" }) {
  return (
    <AppPanel variant="standard" className={`text-[#F5F0E6] ${className}`} style={{ padding: 20 }}>
      {children}
    </AppPanel>
  );
}

export function Hero() {
  return <div className="flex h-[92px] flex-col items-center justify-center text-center"><div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0B5F35]/45">THE JOURNEY BEGINS</div><div className="mt-2 text-[38px] font-black uppercase leading-[0.9] tracking-[-0.015em] text-[#0B5F35]">CHOOSE A TEAM</div></div>;
}

export function BottomTagline() {
  return <div className="flex flex-1 items-center justify-center pb-2 pt-3 text-center"><p className="inline-block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[#072D1D]/45">PICK A TEAM · TAKE YOUR CHANCES · LIFT THE CUP</p></div>;
}

export function SelectionLayout({ children }) {
  return <Shell title="CHOOSE A TEAM"><PageFrame><header className="text-center"><div className="flex items-center justify-center pb-1 pt-1 text-center"><p className="inline-block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-[#072D1D]/45">PICK A TEAM · TAKE YOUR CHANCES · LIFT THE CUP</p></div><div className="flex justify-center"><MondayLogo /></div><Hero /></header><main className="flex min-h-0 flex-1 flex-col py-1"><div className="mt-3">{children}</div></main><Footer /></PageFrame></Shell>;
}

export { PitchPageBackground };

export function DrawerShell({ children, title = "" }) {
  return (
    <AppFrame visualMode="menu" title={title}>
      <PitchPageBackground />
      <AppFrameContent>{children}</AppFrameContent>
    </AppFrame>
  );
}
