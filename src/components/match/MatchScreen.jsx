import { useMemo, useRef, useState } from "react";
import { auth } from "../../firebase.js";
import { FullPitchExtensionBackground, Shell } from "../layout/Layout.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import FootballGame from "./FootballGame.jsx";
import EndMatchModal from "./EndMatchModal.jsx";
import { getResultBadge, ResultBadgeShareOverlay } from "./ResultBadge.jsx";
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
  return currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST";
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
  onChangeTeams,
  onViewBracket,
  onPlayAgain,
  onOpenTrophies,
  hasNewTrophy = false,
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
  twoPlayerMode = false,
  activeMatchSnapshot = null,
  onActiveMatchSnapshot = null,
  matchResetKey = 0,
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
  const resultBadge = getResultBadge({ result: matchResult, fixture: fallbackFixture, stageLabel });
  const showSharedResultBadge = Boolean(matchResult && !activeBadgeMode && resultBadge);

  return (
    <Shell>
      <FullPitchExtensionBackground />
      <div className="relative z-[2] flex h-[100dvh] flex-col overflow-x-visible overflow-y-hidden bg-[#0d6c3d]">
        <ScreenTopBar {...menuProps} style={{ height: MC_SELECTION_LAYOUT.topBarHeight }}>
          MATCH
        </ScreenTopBar>

        <div ref={shareCaptureRef} className="relative min-h-0 flex-1 overflow-x-visible overflow-y-hidden bg-[#0d6c3d]">
          <FootballGame
            key={`${fallbackFixture.id || fallbackFixture.matchId || "match"}:${team || ""}:${opponent || ""}:${matchResetKey}`}
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
            username={username}
            twoPlayerMode={twoPlayerMode}
            stageLabelOverride={twoPlayerMode ? stageLabel : null}
            activeMatchSnapshot={activeMatchSnapshot}
            onActiveMatchSnapshot={onActiveMatchSnapshot}
          />
          {showSharedResultBadge && <ResultBadgeShareOverlay badge={resultBadge} />}
        </div>

        {matchResult && !modalDismissed && (
          <EndMatchModal
            result={matchResult}
            fixture={fallbackFixture}
            onNext={onNextMatch}
            onChangeTeams={onChangeTeams}
            onDismiss={onDismissModal}
            onOpenMenu={() => {
              menuProps?.onToggleMenu?.();
            }}
            onOpenTrophies={onOpenTrophies}
            hasNewTrophy={hasNewTrophy}
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
            username={username}
            twoPlayerMode={twoPlayerMode}
            stageLabelOverride={twoPlayerMode ? stageLabel : null}
          />
        )}

      </div>
    </Shell>
  );
}
