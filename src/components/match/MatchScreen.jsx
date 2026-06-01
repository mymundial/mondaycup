import { useMemo, useRef, useState } from "react";
import { auth } from "../../firebase.js";
import { Shell } from "../layout/Layout.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import FootballGame from "./FootballGame.jsx";
import EndMatchModal from "./EndMatchModal.jsx";
import {
  createFallbackFixture,
  modalButton,
  teamToGameTeam,
  toCompletedGameResult,
} from "../../logic/matchPresentation.js";
import { PODIUM_BADGE_MODE } from "../../logic/resultStatus.js";
import { MC_SELECTION_LAYOUT } from "../../styles/theme.js";
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
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0d6c3d]">
        <ScreenTopBar {...menuProps} style={{ height: MC_SELECTION_LAYOUT.topBarHeight }}>
          MATCH
        </ScreenTopBar>

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
