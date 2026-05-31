import { MenuDropdown } from "./Menu.jsx";
import AppTopBar from "../ui/AppTopBar.jsx";

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
  onShare,
  onRestart,
  onSignOut,
  canSignOut,
  onAuthComplete,
}) {
  const closeMenu = onCloseMenu || onToggleMenu;
  return (
    <AppTopBar
      title={children}
      menuOpen={menuOpen}
      onMenuButtonClick={menuOpen ? closeMenu : onToggleMenu}
      menu={
        <MenuDropdown
          onClose={closeMenu}
          onMatch={onMatch}
          onFixtures={onFixtures}
          onGroups={onGroups}
          onClubhouse={onClubhouse}
          onTrophyCabinet={onTrophyCabinet}
          onLeaderboard={onLeaderboard}
          onShare={onShare}
          onRestart={onRestart}
          onSignOut={onSignOut}
          canSignOut={canSignOut}
          onAuthComplete={onAuthComplete}
          initialView={menuInitialView}
          initialAuthMode={menuInitialAuthMode}
          authShowLogoBack={menuAuthShowLogoBack}
          authRequestId={menuAuthRequestId}
        />
      }
    />
  );
}
