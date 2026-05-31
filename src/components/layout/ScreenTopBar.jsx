import { ASSETS } from "../../data/assets.js";
import { HamburgerIcon } from "../shared.jsx";
import { MenuDropdown } from "./Menu.jsx";
import { MC_COLORS, MC_SIZES, MC_TYPE } from "../../styles/theme.js";

export function ScreenTopBar({
  children,
  menuOpen,
  menuInitialView = "menu",
  menuInitialAuthMode = "signin",
  menuAuthShowLogoBack = false,
  menuAuthRequestId = 0,
  onToggleMenu,
  onCloseMenu,
  onMatch,
  onFixtures,
  onGroups,
  onClubhouse,
  onTrophyCabinet,
  onLeaderboard,
  onRestart,
  onSignOut,
  canSignOut,
  onAuthComplete,
}) {
  const closeMenu = onCloseMenu || onToggleMenu;
  return (
    <section
      className="relative z-[1000] flex shrink-0 items-center justify-center overflow-visible px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]"
      style={{ height: MC_SIZES.topBarHeight, background: MC_COLORS.greenDark }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 z-[1] h-10 w-10 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
      <h2 className="relative z-[1] home-copy-bold text-[clamp(25px,6.1vw,34px)] uppercase leading-none text-[#F5F1E8]" style={MC_TYPE.title}>
        {children}
      </h2>
      <button onClick={menuOpen ? closeMenu : onToggleMenu} aria-label={menuOpen ? "Close menu" : "Open menu"} className="absolute right-3 top-1/2 z-[1001] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F1E8]">
        <HamburgerIcon />
      </button>
      {menuOpen && (
        <MenuDropdown
          onClose={closeMenu}
          onMatch={onMatch}
          onFixtures={onFixtures}
          onGroups={onGroups}
          onClubhouse={onClubhouse}
          onTrophyCabinet={onTrophyCabinet}
          onLeaderboard={onLeaderboard}
          onRestart={onRestart}
          onSignOut={onSignOut}
          canSignOut={canSignOut}
          onAuthComplete={onAuthComplete}
          initialView={menuInitialView}
          initialAuthMode={menuInitialAuthMode}
          authShowLogoBack={menuAuthShowLogoBack}
          authRequestId={menuAuthRequestId}
        />
      )}
    </section>
  );
}
