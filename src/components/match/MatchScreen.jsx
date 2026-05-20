import { ASSETS } from "../../data/assets.js";
import { getTeamTheme, teamCode } from "../../data/teams.js";
import { HamburgerIcon } from "../shared.jsx";
import { Shell } from "../layout/Layout.jsx";
import { MenuDropdown } from "../layout/Menu.jsx";
import FootballGame from "./FootballGame.jsx";

function ScoreboardHeader({ menuProps }) {
  return (
    <div className="relative bg-[#0B5F35] px-4 py-4">
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#F5F0E6]/10" />
      <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-[-1px] bottom-0 h-[66px] w-[66px] object-contain" />
      <div className="flex items-center justify-center">
        <div className="text-[38px] font-black leading-[0.94] tracking-[-0.025em] text-[#F5F0E6]">LIVE MATCH</div>
      </div>
      <button onClick={menuProps.onToggleMenu} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[#0B5F35] pb-[1px] text-lg font-black leading-none text-[#F5F0E6]">
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

function FullTimeModal({ result, onNext }) {
  const title = result.status === "qualified" ? "YOU QUALIFIED!" : result.status === "eliminated" ? "ELIMINATED!" : result.status === "champion" ? "CHAMPIONS!" : result.isDraw ? "DRAW" : result.won ? "YOU WON" : "YOU LOST";
  const buttonLabel = result.status === "eliminated" ? "PLAY AGAIN" : result.status === "champion" ? "VIEW BRACKET" : "NEXT MATCH";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#072D1D]/45 px-5">
      <div className="w-full max-w-sm rounded-[2rem] bg-[#F5F0E6] p-5 text-center text-[#0B5F35] shadow-[0_20px_60px_rgba(7,45,29,0.22)]">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0B5F35]/45">FULL TIME</div>
        <div className="mt-2 text-[34px] font-black uppercase tracking-[-0.03em]">{title}</div>
        <div className="mt-3 rounded-[1.2rem] bg-[#EFE7D8] px-4 py-3 text-[18px] font-black uppercase tracking-[0.04em]">
          <span>{teamCode(result.home)}</span>
          <span className="mx-3 tabular-nums">{result.homeGoals}-{result.awayGoals}</span>
          <span>{teamCode(result.away)}</span>
        </div>
        <button onClick={onNext} className="mt-5 h-12 w-full rounded-full bg-[#0B5F35] text-[13px] font-black uppercase tracking-[0.12em] text-[#F5F0E6]">
          {buttonLabel}
        </button>
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

export function MatchScreen({
  team,
  opponent,
  currentFixture,
  matchResult,
  onMatchComplete,
  onNextMatch,
  menuProps,
  stageLabel = "GROUP STAGE",
}) {
  const pitchBackground = {
    backgroundColor: "#7BCB59",
    backgroundImage: "repeating-linear-gradient(90deg,#6FC14F 0px,#6FC14F 64px,#7BCB59 64px,#7BCB59 128px),radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
    backgroundSize: "128px 100%, 6px 6px",
  };

  const userTeam = toGameTeam(team || "Team A");
  const opponentTeam = toGameTeam(opponent || "Team B");
  const gameAssets = {
    logo: ASSETS.mondayLogo,
  };

  return (
    <Shell>
      <div className="h-[100dvh] overflow-hidden px-5 pt-3" style={pitchBackground}>
        <div className="overflow-hidden rounded-[1.6rem] bg-[#072D1D] shadow-[0_18px_60px_rgba(7,45,29,0.18)]">
          <ScoreboardHeader menuProps={menuProps} />
          <div className="h-[calc(100dvh-96px)] min-h-0 p-2">
            <FootballGame
              userTeam={userTeam}
              opponentTeam={opponentTeam}
              fixture={currentFixture}
              assets={gameAssets}
              onMatchComplete={onMatchComplete}
            />
          </div>
        </div>
        {matchResult && <FullTimeModal result={matchResult} onNext={onNextMatch} />}
      </div>
    </Shell>
  );
}
