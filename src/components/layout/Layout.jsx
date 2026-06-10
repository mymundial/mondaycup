import { MondayLogo } from "../shared.jsx";
import { AppFrame, AppFrameContent } from "./AppFrame.jsx";
import { PitchPageBackground } from "./PitchPageBackground.jsx";
import {
  MC_AD_BOARD_TILE_WIDTH_PX,
  MC_APP_FRAME_WIDTH_PX,
  MC_FRAME_SIDE_SHADOW_WIDTH_PX,
  mcExtendedPitchMowBackground,
} from "../../styles/theme.js";
import AppFooter from "../ui/AppFooter.jsx";
import AppPanel from "../ui/AppPanel.jsx";
import SharedCrowdBackdrop from "../crowd/SharedCrowdBackdrop.jsx";
import { ASSETS } from "../../data/assets.js";
import { MC_SELECTION_LAYOUT } from "../../styles/theme.js";

export function Shell({ children }) {
  return <div className="relative flex min-h-[100dvh] justify-center text-[#072D1D] antialiased" style={mcExtendedPitchMowBackground}><div className="relative z-[1] min-h-[100dvh] w-full max-w-md border-x border-black shadow-[-28px_0_42px_rgba(0,0,0,0.44),28px_0_42px_rgba(0,0,0,0.44),-7px_0_16px_rgba(0,0,0,0.34),7px_0_16px_rgba(0,0,0,0.34)]">{children}</div></div>;
}

function TiledCrowdBackdrop({ style }) {
  const tileCount = 9;
  return (
    <div className="absolute inset-x-0 z-[1] overflow-hidden" style={style}>
      <div className="absolute inset-0 bg-[#123822]" />
      <div className="absolute left-1/2 top-0 flex h-full -translate-x-1/2" style={{ width: MC_APP_FRAME_WIDTH_PX * tileCount }}>
        {Array.from({ length: tileCount }).map((_, index) => (
          <SharedCrowdBackdrop
            key={index}
            density={1}
            rowCount={16}
            className="relative h-full shrink-0 overflow-hidden"
            style={{ width: MC_APP_FRAME_WIDTH_PX }}
          />
        ))}
      </div>
    </div>
  );
}

function RepeatingAdBoard({ style }) {
  const tileWidth = MC_AD_BOARD_TILE_WIDTH_PX;
  const tileCount = 9;
  return (
    <div className="absolute inset-x-0 z-[2] overflow-hidden border-t border-[#05150E] bg-[#072D1D] shadow-[0_-8px_24px_rgba(0,0,0,0.42)]" style={style}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
      <div className="absolute left-1/2 top-0 flex h-full -translate-x-1/2" style={{ width: tileWidth * tileCount }}>
        {Array.from({ length: tileCount }).map((_, index) => (
          <div key={index} className="relative flex h-full shrink-0 items-center justify-center" style={{ width: tileWidth }}>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5F1E8]/16 blur-xl" aria-hidden="true" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[48%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F7D117]/12 blur-lg" aria-hidden="true" />
            <img src="/assets/branding/mondaycup_co_uk.png" alt="" className="relative z-[1] h-[69%] w-[61%] object-contain opacity-[0.84]" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileFrameSideShadows() {
  const frameHalf = MC_APP_FRAME_WIDTH_PX / 2;
  const shadowWidth = MC_FRAME_SIDE_SHADOW_WIDTH_PX;
  return (
    <>
      <div
        className="absolute inset-y-0 z-[40]"
        style={{
          left: `calc(50vw - ${frameHalf}px - ${shadowWidth}px)`,
          width: shadowWidth,
          background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.48) 100%)",
        }}
      />
      <div
        className="absolute inset-y-0 z-[40]"
        style={{
          left: `calc(50vw + ${frameHalf}px)`,
          width: shadowWidth,
          background: "linear-gradient(90deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
    </>
  );
}

export function FullPitchExtensionBackground({ flashStyle = null }) {
  const topBarHeight = MC_SELECTION_LAYOUT.topBarHeight;
  const scoreboardHeight = `calc((100dvh - ${topBarHeight}px) * ${MC_SELECTION_LAYOUT.scoreboardRatio})`;
  const tickerHeight = `calc(${scoreboardHeight} * ${MC_SELECTION_LAYOUT.tickerRatio})`;
  const scoreboardMainHeight = `calc(${scoreboardHeight} - ${tickerHeight})`;
  const upperAdBoardTopCss = `calc(${topBarHeight}px + ${scoreboardMainHeight})`;
  const pitchTop = `calc(${topBarHeight}px + ${scoreboardHeight})`;
  const pitchHeight = `calc(100dvh - ${topBarHeight}px - ${scoreboardHeight})`;
  const goalLine = MC_SELECTION_LAYOUT.goalTopPercent + MC_SELECTION_LAYOUT.goalHeightPercent;
  const adBoardTop = goalLine - MC_SELECTION_LAYOUT.adBoardHeightPercent;
  const frameLeft = `max(0px, calc(50vw - ${MC_APP_FRAME_WIDTH_PX / 2}px))`;
  const frameRight = `max(0px, calc(50vw - ${MC_APP_FRAME_WIDTH_PX / 2}px))`;
  const goalLineTop = `calc(${pitchTop} + (${pitchHeight} * ${goalLine / 100}))`;
  const adBoardTopCss = `calc(${pitchTop} + (${pitchHeight} * ${adBoardTop / 100}))`;
  const adBoardHeightCss = `calc(${pitchHeight} * ${MC_SELECTION_LAYOUT.adBoardHeightPercent / 100})`;
  const crowdHeightCss = `calc(${pitchHeight} * ${adBoardTop / 100})`;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0d6c3d]" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 bg-[#063B25] shadow-[0_2px_8px_rgba(0,0,0,0.16)]" style={{ height: topBarHeight }} />
      <div className="absolute inset-x-0 bg-[#050505]" style={{ top: topBarHeight, height: scoreboardMainHeight }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(247,209,23,0.24) 0.72px, transparent 1.44px)', backgroundSize: '6px calc(100% / 12)', backgroundPosition: 'center top', backgroundRepeat: 'repeat' }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
      </div>
      <RepeatingAdBoard style={{ top: upperAdBoardTopCss, height: tickerHeight }} />
      <TiledCrowdBackdrop style={{ top: pitchTop, height: crowdHeightCss }} />
      <RepeatingAdBoard style={{ top: adBoardTopCss, height: adBoardHeightCss }} />
      <div className="absolute inset-x-0 bottom-0 z-[1]" style={{ top: goalLineTop, ...mcExtendedPitchMowBackground }} />
      <div className="absolute inset-x-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: goalLineTop }} />
      <div className="absolute bottom-0 z-[4] w-2 bg-[#f5f1e8]" style={{ left: frameLeft, top: goalLineTop }} />
      <div className="absolute bottom-0 z-[4] w-2 bg-[#f5f1e8]" style={{ right: frameRight, top: goalLineTop }} />
      <div className="absolute z-[4] h-[54px] w-[54px] rounded-bl-[54px] border-b-8 border-l-8 border-[#f5f1e8]" style={{ left: frameLeft, top: goalLineTop }} />
      <div className="absolute z-[4] h-[54px] w-[54px] rounded-br-[54px] border-b-8 border-r-8 border-[#f5f1e8]" style={{ right: frameRight, top: goalLineTop }} />
      <MobileFrameSideShadows />
    </div>
  );
}

export function PageFrame({ children }) {
  return <div className="flex min-h-[100dvh] flex-col overflow-y-auto bg-[#F5F0E6] px-5 pb-0 pt-2">{children}</div>;
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
