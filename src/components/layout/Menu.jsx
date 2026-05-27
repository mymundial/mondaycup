import { createPortal } from "react-dom";
import { ASSETS } from "../../data/assets.js";
import { HamburgerIcon } from "../shared.jsx";

export function MenuButton({ eyebrow, children, onClick, danger = false }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-[0.75rem] px-3 py-2 text-left transition-colors ${danger ? "text-[#B43A2F] hover:bg-[#B43A2F]/8" : "text-[#0B5F35] hover:bg-[#0B5F35]/8"}`}>
    <span><span className={`block text-[6.5px] font-black uppercase tracking-[0.16em] ${danger ? "text-[#D88F87]" : "text-[#7DAA8F]"}`}>{eyebrow}</span><span className="mt-[2px] block text-[12px] font-black uppercase tracking-[0.1em]">{children}</span></span><span className={`text-[15px] font-black ${danger ? "text-[#D88F87]" : "text-[#7DAA8F]"}`}>›</span>
  </button>;
}

export function MenuDropdown({ onClose, onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard, onRestart }) {
  const menu = (
    <div className="fixed inset-0 isolate flex justify-center bg-[#072D1D]/18" style={{ zIndex: 2147483000 }}>
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 z-[0]" />
      <div className="pointer-events-none relative z-[1] h-[100dvh] w-full max-w-[1080px] px-3 pt-2">
        <div className="pointer-events-auto absolute right-3 top-2 max-h-[calc(100dvh-16px)] w-[min(260px,76vw)] overflow-y-auto rounded-[1.25rem] bg-[#F8F4EC] pb-1 text-[#0B5F35] shadow-[0_14px_30px_rgba(7,45,29,0.14)]">
          <div className="relative flex h-11 items-center justify-center bg-[#0B5F35] text-[#F5F0E6]">
            <div className="text-[16px] font-black uppercase tracking-[0.02em]">MENU</div>
            <button onClick={onClose} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#F5F0E6]"><HamburgerIcon /></button>
          </div>
          <div className="px-2 pt-1">
            <MenuButton eyebrow="return to" onClick={onMatch}>LIVE MATCH</MenuButton>
            <MenuButton eyebrow="check the" onClick={onFixtures}>SCHEDULE</MenuButton>
            <MenuButton eyebrow="tournament" onClick={onGroups}>STANDINGS</MenuButton>
            <MenuButton eyebrow="member area" onClick={onClubhouse}>CLUBHOUSE</MenuButton>
            <MenuButton eyebrow="collection" onClick={onTrophyCabinet}>TROPHY CABINET</MenuButton>
            <MenuButton eyebrow="global rank" onClick={onLeaderboard}>LEADERBOARD</MenuButton>
            <div className="mx-2 my-1 h-px bg-[#0B5F35]/10" />
            <MenuButton eyebrow="TIME FOR A" danger onClick={onRestart}>RESET</MenuButton>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return menu;
  return createPortal(menu, document.body);
}

export function HeaderMenuButton({ onClick }) {
  return <button onClick={onClick} className="absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F0E6]"><HamburgerIcon /></button>;
}

export function ScreenTitle({ children, menuOpen, onToggleMenu, onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard, onRestart }) {
  return <section className="relative z-[220] flex h-[54px] shrink-0 items-center justify-center overflow-visible bg-[#072D1D] px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
    <span className="absolute left-3 top-1/2 z-[1] flex h-8 w-24 -translate-y-1/2 items-center justify-center overflow-hidden"><img src={ASSETS.branding.mondayCupAd} alt="Monday Cup" className="h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} /></span>
    <h2 className="relative z-[1] home-copy-bold text-[clamp(25px,6.1vw,34px)] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">{children}</h2>
    <HeaderMenuButton onClick={onToggleMenu} />
    {menuOpen && <MenuDropdown onClose={onToggleMenu} onMatch={onMatch} onFixtures={onFixtures} onGroups={onGroups} onClubhouse={onClubhouse} onTrophyCabinet={onTrophyCabinet} onLeaderboard={onLeaderboard} onRestart={onRestart} />}
  </section>;
}
