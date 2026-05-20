import { ASSETS } from "../../data/assets.js";
import { GROUPS } from "../../data/teams.js";
import { getTeamTheme, teamCode } from "../../data/teams.js";
import { Flag, HamburgerIcon } from "../shared.jsx";
import { Shell } from "../layout/Layout.jsx";
import { MenuDropdown } from "../layout/Menu.jsx";
import FootballGame from "./FootballGame.jsx";

const LOGO_WHITE = "https://raw.githubusercontent.com/mymundial/mymundial/ad679ee2973445fc1c1c856603f6baf5695d90c6/LOGO-wht.png";

const sortRows = (rows = []) => [...rows].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || 0);

function ScoreboardHeader({ menuProps }) {
  return (
    <div className="relative bg-[#0B5F35] px-4 py-4">
      <div className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[#0B5F35] p-0.5 ring-1 ring-[#F5F0E6]/12">
        <img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain" draggable={false} />
      </div>
      <div className="flex items-center justify-center">
        <div className="text-[38px] font-black leading-[0.94] tracking-[-0.025em] text-[#F5F0E6]">LIVE MATCH</div>
      </div>
      <button onClick={menuProps.onToggleMenu} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[#0B5F35] pb-[1px] text-lg font-black leading-none text-[#F5F0E6] ring-1 ring-[#F5F0E6]/12">
        <HamburgerIcon />
      </button>
      {menuProps.menuOpen && (
        <MenuDropdown
          onClose={menuProps.onToggleMenu}
          onMatch={menuProps.onMatch}
          onFixtures={menuProps.onFixtures}
          onGroups={menuProps.onGroups}
          onRestart={menuProps.onRestart}
        />
      )}
    </div>
  );
}

function GroupStandingsMini({ table, group, userTeam }) {
  if (!table || !group || !GROUPS[group]) return null;
  const rows = sortRows(GROUPS[group].map((name) => table[name]).filter(Boolean));
  return (
    <div className="mt-4 overflow-hidden rounded-[1.2rem] bg-[#EFE7D8] p-2 text-[#072D1D] ring-1 ring-[#0B5F35]/8">
      <div className="mb-1 grid grid-cols-[26px_1fr_repeat(5,25px)] gap-1 px-2 text-center text-[8px] font-black uppercase tracking-[0.08em] text-[#0B5F35]/45">
        <span />
        <span className="text-left">Team</span>
        <span>P</span><span>GD</span><span>GF</span><span>GA</span><span>PTS</span>
      </div>
      {rows.map((row) => {
        const isUser = row.team === userTeam;
        return (
          <div key={row.team} className={`mb-1 grid grid-cols-[26px_1fr_repeat(5,25px)] items-center gap-1 rounded-xl px-2 py-1.5 text-center text-[9px] font-black last:mb-0 ${isUser ? "bg-[#DCE9DE]" : "bg-[#F8F4EC]"}`}>
            <Flag team={row.team} className="h-[18px] w-[26px] rounded" />
            <span className="text-left text-[10px] font-black text-[#0B5F35]">{teamCode(row.team)}</span>
            <span>{row.played}</span><span>{row.gd}</span><span>{row.gf}</span><span>{row.ga}</span><span className="text-[#0B5F35]">{row.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function ResultScoreCard({ result }) {
  return (
    <div className="mt-4 rounded-[1.2rem] bg-[#EFE7D8] px-4 py-3 text-[#072D1D] ring-1 ring-[#0B5F35]/8">
      <div className="grid grid-cols-[30px_1fr_54px_1fr_30px] items-center gap-2 text-[10px] font-black uppercase">
        <Flag team={result.home} className="h-5 w-7 rounded" />
        <span className="truncate text-right text-[#0B5F35]">{teamCode(result.home)}</span>
        <span className="text-center text-[18px] tabular-nums text-[#072D1D]">{result.homeGoals}-{result.awayGoals}</span>
        <span className="truncate text-left text-[#0B5F35]">{teamCode(result.away)}</span>
        <Flag team={result.away} className="h-5 w-7 rounded" />
      </div>
    </div>
  );
}

function FullTimeModal({ result, onNext, onViewStandings, table, selectedGroup, userTeam }) {
  const isGroup = result.week != null;
  const isFinal = result.matchNo === 104 || result.status === "champion";
  const title = isGroup
    ? result.week === 3
      ? result.status === "qualified" ? "QUALIFIED!" : "ELIMINATED"
      : result.isDraw ? "DRAW" : result.won ? "YOU WON!" : "YOU LOST!"
    : isFinal && result.won
      ? "CHAMPIONS!"
      : result.won ? "QUALIFIED" : "ELIMINATED";
  const primaryLabel = result.status === "champion" ? "VIEW BRACKET" : result.won || result.status === "qualified" ? "NEXT MATCH" : "TRY AGAIN";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#072D1D]/50 px-5">
      <div className="w-full max-w-sm rounded-[2rem] bg-[#F5F0E6] p-5 text-center text-[#0B5F35] shadow-[0_20px_60px_rgba(7,45,29,0.22)]">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0B5F35]/45">FULL TIME</div>
        <div className="mt-2 text-[34px] font-black uppercase tracking-[-0.03em]">{title}</div>
        {isGroup ? <GroupStandingsMini table={table} group={selectedGroup} userTeam={userTeam} /> : <ResultScoreCard result={result} />}
        <button type="button" className="mt-4 h-10 w-full rounded-full border border-[#0B5F35]/15 bg-[#EFE7D8] text-[11px] font-black uppercase tracking-[0.12em] text-[#0B5F35]">
          SHARE MATCH
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onViewStandings} className="h-12 rounded-full bg-[#DCE9DE] text-[11px] font-black uppercase tracking-[0.11em] text-[#0B5F35]">
            VIEW STANDINGS
          </button>
          <button onClick={onNext} className="h-12 rounded-full bg-[#0B5F35] text-[11px] font-black uppercase tracking-[0.11em] text-[#F5F0E6]">
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function toGameTeam(name) {
  const theme = getTeamTheme(name || "Opponent");
  return {
    id: name,
    name,
    code: teamCode(name || "TBD"),
    flag: "",
    primaryColour: theme.bg || "#0B5F35",
    textColour: theme.text || "#F5F0E6",
  };
}

function buildCrowdColours() {
  return Object.values(GROUPS)
    .flat()
    .map((name) => getTeamTheme(name)?.bg)
    .filter(Boolean);
}

export function MatchScreen({
  team,
  opponent,
  currentFixture,
  matchResult,
  onMatchComplete,
  onNextMatch,
  onViewStandings,
  menuProps,
  stageLabel = "GROUP STAGE",
  table,
  selectedGroup,
  tournamentComplete = false,
}) {
  const userTeam = toGameTeam(team || "Team A");
  const opponentTeam = toGameTeam(opponent || "Team B");
  const gameAssets = {
    logo: LOGO_WHITE,
    crowdColours: buildCrowdColours(),
  };

  return (
    <Shell>
      <div className="h-[100dvh] overflow-hidden bg-[#0d6c3d]">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0d6c3d]">
          <ScoreboardHeader menuProps={menuProps} />
          <div className="min-h-0 flex-1 overflow-hidden">
            <FootballGame
              userTeam={userTeam}
              opponentTeam={opponentTeam}
              fixture={currentFixture}
              assets={gameAssets}
              onMatchComplete={onMatchComplete}
              completedResult={tournamentComplete ? matchResult : null}
            />
          </div>
        </div>
        {matchResult && (
          <FullTimeModal
            result={matchResult}
            onNext={onNextMatch}
            onViewStandings={onViewStandings}
            table={table}
            selectedGroup={selectedGroup}
            userTeam={team}
          />
        )}
      </div>
    </Shell>
  );
}
