import { ASSETS } from "../../data/assets.js";
import { FLAG_CC, getTeamTheme, teamCode } from "../../data/teams.js";
import { Flag, HamburgerIcon } from "../shared.jsx";
import { Shell } from "../layout/Layout.jsx";
import { MenuDropdown } from "../layout/Menu.jsx";
import FootballGame from "./FootballGame.jsx";

function teamToGameTeam(name) {
  const theme = getTeamTheme(name);
  const cc = FLAG_CC[name];
  return {
    id: name,
    name,
    code: teamCode(name),
    flag: cc ? `https://flagcdn.com/w80/${cc}.png` : "",
    primaryColour: theme.bg,
    textColour: theme.text,
  };
}

function modalTitle(result) {
  if (result.status === "qualified") return "QUALIFIED!";
  if (result.status === "eliminated" || result.status === "thirdPlace") return "ELIMINATED!";
  if (result.status === "champion") return "CHAMPIONS!";
  if (result.isDraw || result.homeGoals === result.awayGoals) return "DRAW!";
  if (result.status === "knockoutWin") return "QUALIFIED!";
  return result.won ? "VICTORY!" : "DEFEAT!";
}

function modalButton(result) {
  if (result.status === "thirdPlace") return "NEXT MATCH";
  if (result.status === "eliminated") return "TRY AGAIN";
  if (result.status === "champion") return "VIEW BRACKET";
  return "NEXT MATCH";
}

function StandingsMiniTable({ rows = [], qualifiedTeams = new Set(), userTeam = null }) {
  if (!rows.length) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-[1.15rem] bg-[#EFE7D8] p-2 ring-1 ring-[#0B5F35]/10">
      <div className="grid grid-cols-[22px_minmax(0,1fr)_18px_24px_24px_24px_24px_28px] gap-1 px-2 pb-1 text-center text-[7px] font-black uppercase tracking-[0.08em] text-[#0B5F35]/45">
        <span>#</span><span className="text-left">Team</span><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isUser = row.team === userTeam;
        const isQualified = qualifiedTeams.has(row.team);
        return (
          <div key={row.team} className={`mb-1 grid grid-cols-[22px_minmax(0,1fr)_18px_24px_24px_24px_24px_28px] items-center gap-1 rounded-xl px-2 py-1.5 text-center text-[9px] font-bold text-[#072D1D]/80 last:mb-0 ${isUser ? "bg-[#DCE9DE]" : "bg-[#F8F4EC]"}`}>
            <span>{index + 1}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-left">
              <Flag team={row.team} className="h-4 w-6" />
              <span className="truncate uppercase">{row.team}</span>
            </span>
            <span className="text-[10px] font-black text-[#0B5F35]">{isQualified ? "Q" : ""}</span>
            <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span className="font-black">{row.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function FullTimeModal({ result, onNext, onDismiss, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel }) {
  const isKnockout = !result.week;
  const contextLabel = isKnockout ? stageLabel : `GROUP ${selectedGroup}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#072D1D]/45 px-5">
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-[#F5F0E6] text-center text-[#0B5F35] shadow-[0_20px_60px_rgba(7,45,29,0.22)]">
        <div className="relative min-h-[76px] px-5 pb-3 pt-4">
          <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 object-contain" draggable={false} />
          <div className="px-12 text-[30px] font-black uppercase leading-[0.92] tracking-[-0.035em]">{modalTitle(result)}</div>
          <button onClick={onDismiss} aria-label="Close result" className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-[#0B5F35] text-[28px] font-black leading-none text-[#F5F0E6]">
            ×
          </button>
        </div>

        <div className="px-5 pb-5">
          {isKnockout ? (
            <>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#0B5F35]/45">{contextLabel}</div>
              <div className="mt-2 rounded-[1.25rem] bg-[#EFE7D8] px-3 py-3">
                <div className="grid grid-cols-[34px_minmax(0,1fr)_auto_minmax(0,1fr)_34px] items-center gap-3">
                  <Flag team={result.home} className="h-5 w-8" />
                  <span className="min-w-0 truncate text-right text-[18px] font-black uppercase tracking-[0.04em]">{teamCode(result.home)}</span>
                  <span className="rounded-full bg-[#0B5F35] px-5 py-1 text-[24px] font-black tabular-nums text-[#F5F0E6]">{result.homeGoals}-{result.awayGoals}</span>
                  <span className="min-w-0 truncate text-left text-[18px] font-black uppercase tracking-[0.04em]">{teamCode(result.away)}</span>
                  <Flag team={result.away} className="h-5 w-8" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#0B5F35]/45">{contextLabel}</div>
              <StandingsMiniTable rows={groupRows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />
            </>
          )}

          <button onClick={onNext} className="mt-5 h-12 w-full rounded-full bg-[#0B5F35] text-[13px] font-black uppercase tracking-[0.12em] text-[#F5F0E6]">{modalButton(result)}</button>
        </div>
      </div>
    </div>
  );
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
  menuProps,
  stageLabel = "GROUP STAGE",
  fixture,
  groupRows = [],
  qualifiedTeams = new Set(),
  selectedGroup = "A",
}) {
  const userTeam = teamToGameTeam(team || "Team A");
  const opponentTeam = teamToGameTeam(opponent || "Team B");
  const fallbackFixture = fixture || {
    id: `${team || "team"}-${opponent || "opponent"}`,
    matchNo: null,
    stage: "group",
    homeTeamId: team || "Team A",
    awayTeamId: opponent || "Team B",
    allowDraw: true,
    requiresWinner: false,
  };
  const completedResult = matchResult ? {
    fixtureId: fallbackFixture.id,
    matchNo: fallbackFixture.matchNo,
    stage: fallbackFixture.stage,
    home: matchResult.home,
    away: matchResult.away,
    homeTeam: matchResult.home,
    awayTeam: matchResult.away,
    homeGoals: matchResult.homeGoals,
    awayGoals: matchResult.awayGoals,
    won: matchResult.won,
    status: matchResult.status,
    isDraw: matchResult.isDraw,
  } : null;

  return (
    <Shell>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F5F0E6]">
        <div className="relative flex h-[54px] shrink-0 items-center justify-center bg-[#F5F0E6] text-[#0B5F35]">
          <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 object-contain" draggable={false} />
          <div className="text-[24px] font-black uppercase tracking-[-0.02em]">LIVE MATCH</div>
          <button onClick={menuProps.onToggleMenu} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-[#0B5F35] text-[#F5F0E6]">
            <HamburgerIcon />
          </button>
          {menuProps.menuOpen && <MenuDropdown onClose={menuProps.onToggleMenu} onMatch={menuProps.onMatch} onFixtures={menuProps.onFixtures} onGroups={menuProps.onGroups} onRestart={menuProps.onRestart} />}
        </div>

        <div className="min-h-0 flex-1">
          <FootballGame
            userTeam={userTeam}
            opponentTeam={opponentTeam}
            fixture={fallbackFixture}
            onMatchComplete={onMatchComplete || onQuickWin}
            completedResult={completedResult}
          />
        </div>

        {matchResult && !modalDismissed && (
          <FullTimeModal
            result={matchResult}
            onNext={onNextMatch}
            onDismiss={onDismissModal}
            groupRows={groupRows}
            qualifiedTeams={qualifiedTeams}
            userTeam={team}
            selectedGroup={selectedGroup}
            stageLabel={stageLabel}
          />
        )}
        {matchResult && modalDismissed && (
          <button onClick={onNextMatch} className="fixed bottom-5 left-1/2 z-[85] h-12 w-[min(22rem,calc(100%-2.5rem))] -translate-x-1/2 rounded-full bg-[#0B5F35] text-[13px] font-black uppercase tracking-[0.12em] text-[#F5F0E6] shadow-[0_14px_34px_rgba(7,45,29,0.26)]">
            {modalButton(matchResult)}
          </button>
        )}
      </div>
    </Shell>
  );
}
