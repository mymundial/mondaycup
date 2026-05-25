import { useState } from "react";
import { ASSETS } from "../../data/assets.js";
import { Flag, HamburgerIcon } from "../shared.jsx";
import { Shell } from "../layout/Layout.jsx";
import { MenuDropdown } from "../layout/Menu.jsx";
import FootballGame from "./FootballGame.jsx";
import {
  createFallbackFixture,
  modalButton,
  modalHeaderTitle,
  teamToGameTeam,
  toCompletedGameResult,
} from "../../logic/matchPresentation.js";

function CloseIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}


function FormTracker({ form = [] }) {
  const ledClass = (value) => {
    if (value === "W") return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.85),0_0_22px_rgba(34,197,94,0.32)]";
    if (value === "L") return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85),0_0_22px_rgba(239,68,68,0.32)]";
    if (value === "D") return "bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.9),0_0_22px_rgba(247,209,23,0.34)]";
    return "bg-[#F7D117]/35 shadow-[0_0_7px_rgba(247,209,23,0.38),0_0_14px_rgba(247,209,23,0.14)]";
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} className={`h-5 w-5 rounded-full ${ledClass(form[index])}`} />
      ))}
    </div>
  );
}

function StandingsMiniTable({ rows = [], qualifiedTeams = new Set(), userTeam = null }) {
  if (!rows.length) return null;

  return (
    <div className="mt-1 overflow-visible">
      <div className="grid grid-cols-[22px_30px_minmax(0,1fr)_18px_24px_24px_24px_24px_28px] gap-1 px-2 pb-1.5 text-center text-[8px] home-copy-bold uppercase tracking-[0.1em] text-[#0B5F35]/45">
        <span>#</span><span className="text-center">Team</span><span aria-hidden="true" /><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isUser = row.team === userTeam;
        const isQualified = qualifiedTeams.has(row.team);
        return (
          <div key={row.team} className={`mb-1 grid grid-cols-[22px_30px_minmax(0,1fr)_18px_24px_24px_24px_24px_28px] items-center gap-1 rounded-xl px-2 py-[5px] text-center text-[11px] text-[#072D1D]/80 last:mb-0 ring-1 ${isUser ? "bg-[#DCE9DE] home-copy-regular ring-[#CFE2D3]" : "bg-[#F8F4EC] home-copy-light ring-[#0B5F35]/5"}`}>
            <span>{index + 1}</span>
            <span className="flex justify-center"><Flag team={row.team} className="h-4 w-6" /></span>
            <span className={`min-w-0 truncate text-left uppercase ${isUser ? "home-copy-regular" : "home-copy-light"}`}>{row.team}</span>
            <span className="text-[10px] font-black text-[#0B5F35]">{isQualified ? "Q" : ""}</span>
            <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span className="font-black">{row.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function FullTimeModal({ result, onNext, onDismiss, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel, userForm }) {
  const isKnockout = !result.week;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#072D1D]/45 px-5 pt-14">
      <div className="relative w-full max-w-sm overflow-visible rounded-[2rem] bg-[#EFE7D8] text-center text-[#0B5F35] shadow-[0_20px_60px_rgba(7,45,29,0.22)]">
        <div className="absolute left-1/2 top-[-52px] z-[3] -translate-x-1/2 overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#050505] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.16),inset_0_-1px_0_rgba(245,241,232,0.18),0_0_14px_rgba(7,45,29,0.38)]">
          <div
            className="absolute inset-x-0 top-[3px] bottom-[3px] opacity-45"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(247,209,23,0.24) 0.78px, transparent 1.55px)",
              backgroundSize: "7px 7px",
              backgroundPosition: "3.5px 3.5px",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
          <div className="relative z-[1]"><FormTracker form={userForm} /></div>
        </div>
        <div className="overflow-hidden rounded-t-[2rem] bg-[#0B5F35] px-5 py-2 text-[#F5F0E6]">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center">
              <img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain" draggable={false} />
            </div>
            <div className="text-center home-copy-bold text-[25px] uppercase leading-[0.95] tracking-[0.06em] text-[#F5F0E6]">{modalHeaderTitle({ isKnockout, stageLabel, selectedGroup })}</div>
            <button onClick={onDismiss} aria-label="Close result" className="flex h-9 w-9 items-center justify-center justify-self-end text-[#F5F0E6]">
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 pt-3">
          {isKnockout ? (
            <>
              <div className={`mt-1 rounded-[1.25rem] bg-[#DCE9DE] px-2.5 py-3 ${(result.home === userTeam || result.away === userTeam) ? "ring-1 ring-[#CFE2D3]" : ""}`}>
                <div className="grid min-h-[32px] grid-cols-[28px_minmax(0,1fr)_34px_minmax(0,1fr)_28px] items-center gap-1 home-main-font text-[clamp(13px,3.4vw,15px)] uppercase leading-none text-[#3E4F46]">
                  <div className="flex items-center justify-center"><Flag team={result.home} className="h-5 w-7" /></div>
                  <span className={`block min-w-0 truncate text-center tracking-[0.005em] ${result.home === userTeam ? "home-copy-regular" : "home-copy-light"}`} title={result.home}>{result.home}</span>
                  <span className="flex items-center justify-center font-black tabular-nums leading-none text-[#0B5F35]">{result.homeGoals}-{result.awayGoals}</span>
                  <span className={`block min-w-0 truncate text-center tracking-[0.005em] ${result.away === userTeam ? "home-copy-regular" : "home-copy-light"}`} title={result.away}>{result.away}</span>
                  <div className="flex items-center justify-center"><Flag team={result.away} className="h-5 w-7" /></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <StandingsMiniTable rows={groupRows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />
            </>
          )}

          <button onClick={onNext} className="mx-auto mt-2.5 flex h-10 w-full items-center justify-center rounded-full bg-[#0B5F35] home-copy-bold text-[15px] uppercase tracking-[0.14em] text-[#F5F0E6]">{modalButton(result)}</button>
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
  userForm = [],
  campaignId = "default",
}) {
  const [matchBusy, setMatchBusy] = useState(false);
  const userTeam = teamToGameTeam(team || "Team A");
  const opponentTeam = teamToGameTeam(opponent || "Team B");
  const fallbackFixture = fixture || createFallbackFixture({ team, opponent });
  const completedResult = toCompletedGameResult(matchResult, fallbackFixture);

  return (
    <Shell>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#EFE7D8]">
        <div className="relative z-[3] flex h-[54px] shrink-0 items-center justify-center overflow-hidden bg-[#072D1D] px-6 text-[#F5F1E8]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
          <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 z-[1] h-12 w-12 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
          <div className="relative z-[1] home-copy-bold text-[clamp(30px,7.2vw,38px)] font-black uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">MATCH</div>
          <button onClick={menuProps.onToggleMenu} disabled={matchBusy} aria-disabled={matchBusy} title={matchBusy ? "Menu available after the shot" : "Open menu"} className={`absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-[#F5F1E8] text-[#0B5F35] shadow-[0_4px_10px_rgba(0,0,0,0.20)] ${matchBusy ? "cursor-not-allowed opacity-45" : ""}`}>
            <HamburgerIcon />
          </button>
          {menuProps.menuOpen && <MenuDropdown onClose={menuProps.onToggleMenu} onMatch={menuProps.onMatch} onFixtures={menuProps.onFixtures} onGroups={menuProps.onGroups} onRestart={menuProps.onRestart} />}
        </div>

        <div className="min-h-0 flex-1">
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
            userForm={userForm}
          />
        )}

      </div>
    </Shell>
  );
}
