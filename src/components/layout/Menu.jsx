import { ASSETS } from "../../data/assets.js";
import { HamburgerIcon } from "../shared.jsx";

export function MenuButton({ eyebrow, children, onClick, danger = false }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-[0.75rem] px-3 py-2.5 text-left transition-colors ${danger ? "text-[#B43A2F] hover:bg-[#B43A2F]/8" : "text-[#0B5F35] hover:bg-[#0B5F35]/8"}`}>
    <span><span className={`block text-[7px] font-black uppercase tracking-[0.16em] ${danger ? "text-[#D88F87]" : "text-[#7DAA8F]"}`}>{eyebrow}</span><span className="mt-[3px] block text-[13px] font-black uppercase tracking-[0.1em]">{children}</span></span><span className={`text-[15px] font-black ${danger ? "text-[#D88F87]" : "text-[#7DAA8F]"}`}>›</span>
  </button>;
}

export function MenuDropdown({ onClose, onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard, onRestart }) {
  return <div className="fixed inset-0 z-[80] flex justify-center bg-[#072D1D]/18"><button aria-label="Close menu" onClick={onClose} className="absolute inset-0" /><div className="pointer-events-none relative h-[100dvh] w-full max-w-md px-5 pt-3"><div className="pointer-events-auto absolute right-5 top-3 w-[190px] overflow-hidden rounded-[1.25rem] bg-[#F8F4EC] pb-2 text-[#0B5F35] shadow-[0_14px_30px_rgba(7,45,29,0.14)]"><div className="relative flex h-12 items-center justify-center bg-[#0B5F35] text-[#F5F0E6]"><div className="text-[16px] font-black uppercase tracking-[0.02em]">MENU</div><button onClick={onClose} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#F5F0E6]"><HamburgerIcon /></button></div><div className="px-2 pt-1.5"><MenuButton eyebrow="return to" onClick={onMatch}>LIVE MATCH</MenuButton><MenuButton eyebrow="check the" onClick={onFixtures}>SCHEDULE</MenuButton><MenuButton eyebrow="tournament" onClick={onGroups}>STANDINGS</MenuButton><MenuButton eyebrow="member area" onClick={onClubhouse}>CLUBHOUSE</MenuButton><MenuButton eyebrow="collection" onClick={onTrophyCabinet}>TROPHY CABINET</MenuButton><MenuButton eyebrow="global rank" onClick={onLeaderboard}>LEADERBOARD</MenuButton><div className="mx-2 my-1.5 h-px bg-[#0B5F35]/10" /><MenuButton eyebrow="TIME FOR A" danger onClick={onRestart}>RESET</MenuButton></div></div></div></div>;
}

export function HeaderMenuButton({ onClick }) {
  return <button onClick={onClick} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-[#0B5F35] text-[#F5F0E6] shadow-[0_3px_10px_rgba(7,45,29,0.14)]"><HamburgerIcon /></button>;
}

export function ScreenTitle({ children, menuOpen, onToggleMenu, onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard, onRestart }) {
  return <section className="relative mb-2 flex h-[54px] shrink-0 items-center justify-center bg-[#F5F1E8] text-[#0B5F35] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
    <span className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center overflow-hidden"><img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain" draggable={false} /></span>
    <h2 className="home-copy-bold text-[25px] uppercase tracking-[-0.02em]">{children}</h2>
    <HeaderMenuButton onClick={onToggleMenu} />
    {menuOpen && <MenuDropdown onClose={onToggleMenu} onMatch={onMatch} onFixtures={onFixtures} onGroups={onGroups} onClubhouse={onClubhouse} onTrophyCabinet={onTrophyCabinet} onLeaderboard={onLeaderboard} onRestart={onRestart} />}
  </section>;
}
