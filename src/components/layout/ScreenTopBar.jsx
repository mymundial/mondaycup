import { ASSETS } from "../../data/assets.js";
import { HamburgerIcon } from "../shared.jsx";
import { MenuDropdown } from "./Menu.jsx";

export function ScreenTopBar({ children, menuOpen, onToggleMenu, onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard, onRestart }) {
  return (
    <section className="relative z-[220] flex h-[54px] shrink-0 items-center justify-center overflow-visible bg-[#072D1D] px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 z-[1] h-12 w-12 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
      <h2 className="relative z-[1] home-copy-bold text-[clamp(25px,6.1vw,34px)] font-black uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">
        {children}
      </h2>
      <button onClick={onToggleMenu} aria-label="Open menu" className="absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F1E8]">
        <HamburgerIcon />
      </button>
      {menuOpen && <MenuDropdown onClose={onToggleMenu} onMatch={onMatch} onFixtures={onFixtures} onGroups={onGroups} onClubhouse={onClubhouse} onTrophyCabinet={onTrophyCabinet} onLeaderboard={onLeaderboard} onRestart={onRestart} />}
    </section>
  );
}
