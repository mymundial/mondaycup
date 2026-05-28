import { useMemo, useRef, useState } from "react";
import { ASSETS } from "../../data/assets.js";
import { auth } from "../../firebase.js";
import { HamburgerIcon } from "../shared.jsx";
import { Shell } from "../layout/Layout.jsx";
import { MenuDropdown } from "../layout/Menu.jsx";
import FootballGame from "./FootballGame.jsx";
import EndMatchModal from "./EndMatchModal.jsx";
import { MC_COLORS, MC_TYPE } from "../../styles/theme.js";
import {
  createFallbackFixture,
  modalButton,
  teamToGameTeam,
  toCompletedGameResult,
} from "../../logic/matchPresentation.js";
import { PODIUM_BADGE_MODE } from "../../logic/resultStatus.js";
import {
  getPodiumBadgeMode,
  isTerminalShareResult,
} from "../../logic/podium.js";

function getDisplayUsername() {
  const currentUser = auth.currentUser;
  return currentUser?.displayName || currentUser?.email?.split("@")[0] || "";
}


export function MatchScreen({
  team,
  opponent,
  score,
  matchResult,
  modalDismissed = false,
  onDismissModal,
  onQuickWin,
  onMatchComplete,
  onNextMatch,
  onViewBracket,
  onPlayAgain,
  menuProps,
  stageLabel = "GROUP STAGE",
  fixture,
  groupRows = [],
  qualifiedTeams = new Set(),
  selectedGroup = "A",
  userForm = [],
  campaignId = "default",
  podium = null,
  activeCosmetics = null,
}) {
  const [matchBusy, setMatchBusy] = useState(false);
  const shareCaptureRef = useRef(null);
  const username = useMemo(() => getDisplayUsername(), [matchResult]);
  const isTerminalResult = isTerminalShareResult({ result: matchResult, fixture, stageLabel, podium, team });
  const userTeam = teamToGameTeam(team || "Team A");
  const opponentTeam = teamToGameTeam(opponent || "Team B");
  const fallbackFixture = fixture || createFallbackFixture({ team, opponent });
  const completedResult = toCompletedGameResult(matchResult, fallbackFixture);
  const activeBadgeMode = getPodiumBadgeMode({ result: matchResult, fixture, stageLabel, podium, team });
  const showChampionsBadge = activeBadgeMode === PODIUM_BADGE_MODE.CHAMPION;

  return (
    <Shell>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#EFE7D8]">
        <div className="relative z-[1000] flex h-[54px] shrink-0 items-center justify-center overflow-hidden px-6 text-[#F5F1E8]" style={{ background: MC_COLORS.greenDark }}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
          <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 z-[1] h-10 w-10 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
          <div className="relative z-[1] home-copy-bold text-[clamp(30px,7.2vw,38px)] uppercase leading-none text-[#F5F1E8]" style={MC_TYPE.title}>MATCH</div>
          <button onClick={menuProps.onToggleMenu} disabled={matchBusy} aria-disabled={matchBusy} title={matchBusy ? "Menu available after the shot" : "Open menu"} className={`absolute right-3 top-1/2 z-[1001] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F1E8] ${matchBusy ? "cursor-not-allowed opacity-45" : ""}`}>
            <HamburgerIcon />
          </button>
          {menuProps.menuOpen && <MenuDropdown onClose={menuProps.onToggleMenu} onMatch={menuProps.onMatch} onFixtures={menuProps.onFixtures} onGroups={menuProps.onGroups} onClubhouse={menuProps.onClubhouse} onTrophyCabinet={menuProps.onTrophyCabinet} onLeaderboard={menuProps.onLeaderboard} onRestart={menuProps.onRestart} onSignOut={menuProps.onSignOut} canSignOut={menuProps.canSignOut} />}
        </div>

        <div ref={shareCaptureRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#0d6c3d]">
          {isTerminalResult && username && (
            <div className="pointer-events-none absolute left-1/2 top-[11.8%] z-[25] -translate-x-1/2 text-center font-led text-[clamp(9px,1.35vh,16px)] font-black uppercase tracking-[0.14em] text-[#F7D117] led-text-glow">
              {username}
            </div>
          )}
          <FootballGame
            userTeam={userTeam}
            opponentTeam={opponentTeam}
            fixture={fallbackFixture}
            campaignId={campaignId}
            onMatchComplete={onMatchComplete || onQuickWin}
            completedResult={completedResult}
            endActionLabel={matchResult && modalDismissed ? modalButton(matchResult) : "FULL TIME"}
            endActionEnabled={Boolean(matchResult && modalDismissed)}
            onEndAction={onNextMatch}
            onBusyChange={setMatchBusy}
            showChampionsBadge={showChampionsBadge}
            podiumBadgeMode={activeBadgeMode}
            activeCosmetics={activeCosmetics}
          />
        </div>

        {matchResult && !modalDismissed && (
          <EndMatchModal
            result={matchResult}
            fixture={fallbackFixture}
            onNext={onNextMatch}
            onDismiss={onDismissModal}
            onViewBracket={onViewBracket}
            onPlayAgain={onPlayAgain}
            groupRows={groupRows}
            qualifiedTeams={qualifiedTeams}
            userTeam={team}
            selectedGroup={selectedGroup}
            stageLabel={stageLabel}
            userForm={userForm}
            shareCaptureRef={shareCaptureRef}
            podium={podium}
          />
        )}

      </div>
    </Shell>
  );
}
