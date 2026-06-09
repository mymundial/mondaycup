import { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "../../data/assets.js";
import { Flag } from "../shared.jsx";
import { PODIUM_BADGE_MODE, RESULT_STATUS, normalizeResultStatus } from "../../logic/resultStatus.js";
import { ShareMatchPreview } from "../share/ShareScreen.jsx";
import {
  modalButton,
  modalHeaderTitle,
  teamToGameTeam,
} from "../../logic/matchPresentation.js";
import {
  getPodiumBadgeMode,
  isTerminalShareResult,
} from "../../logic/podium.js";
import {
  normaliseThirdPlaceCopy,
  shareNativeImage,
  shareOrDownloadResult,
  warmShareExportRenderer,
} from "../../utils/shareExport.js";
import { createMatchShareBlob } from "../../utils/matchShareCanvas.js";
import { TEAM_RANK } from "../../data/teams.js";

const FIXTURE_VENUES = {
  73: "Los Angeles Stadium",
  74: "Houston Stadium",
  75: "Boston Stadium",
  76: "Estadio Monterrey",
  77: "Dallas Stadium",
  78: "New York New Jersey Stadium",
  79: "Mexico City Stadium",
  80: "Atlanta Stadium",
  81: "Seattle Stadium",
  82: "San Francisco Bay Area Stadium",
  83: "Los Angeles Stadium",
  84: "Toronto Stadium",
  85: "BC Place Vancouver",
  86: "Dallas Stadium",
  87: "Miami Stadium",
  88: "Kansas City Stadium",
  89: "Houston Stadium",
  90: "Philadelphia Stadium",
  91: "New York New Jersey Stadium",
  92: "Mexico City Stadium",
  93: "Dallas Stadium",
  94: "Seattle Stadium",
  95: "Atlanta Stadium",
  96: "BC Place Vancouver",
  97: "Boston Stadium",
  98: "Los Angeles Stadium",
  99: "Miami Stadium",
  100: "Kansas City Stadium",
  101: "Dallas Stadium",
  102: "Atlanta Stadium",
  103: "Miami Stadium",
  104: "New York New Jersey Stadium",
};

function fixtureVenueName(matchNo, fixture = {}, result = {}) {
  const fixtureMeta = result?.fixture || {};
  return String(
    result?.stadium ||
    result?.venue ||
    fixture?.stadium ||
    fixture?.venue ||
    fixtureMeta?.stadium ||
    fixtureMeta?.venue ||
    FIXTURE_VENUES[Number(matchNo)] ||
    ""
  ).trim();
}

function CloseIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}


function TickIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5.5 12.3l4.15 4.15L18.75 7.35" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackArrowIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.5 4.75L8.25 12l7.25 7.25" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8.8 12.2l6.4-3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="M8.8 12.2l6.4 3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="6.4" cy="12" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="5.9" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="18.1" r="2.45" stroke="currentColor" strokeWidth="2.35" />
    </svg>
  );
}

function ExportButton({ icon, label, onClick, disabled, primary = false, busy = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`mx-auto flex h-[50px] min-h-[50px] w-full max-w-[400px] items-center justify-center gap-2 rounded-[16px] border px-4 text-center home-copy-bold text-[16px] font-black uppercase leading-none tracking-[0.14em] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65 ${primary ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/82 text-[#F5F1E8]"} ${className}`}
    >
      {icon}
      <span>{busy ? "WAIT" : label}</span>
    </button>
  );
}

function MenuIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8 4h8v3.5c0 2.7-1.55 4.7-4 5.35-2.45-.65-4-2.65-4-5.35V4Z" stroke="currentColor" strokeWidth="2.35" strokeLinejoin="round" />
      <path d="M8.15 6H5.5v1.2c0 2.05 1.15 3.55 3.25 4.05M15.85 6h2.65v1.2c0 2.05-1.15 3.55-3.25 4.05" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v3.2M8.8 20h6.4M10 16.2h4v2.2h-4z" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RewardNoticeDot() {
  return (
    <span
      className="absolute right-[clamp(7px,1.8vw,10px)] top-[clamp(7px,1.8vw,10px)] h-[clamp(9px,2.5vw,12px)] w-[clamp(9px,2.5vw,12px)] rounded-full bg-[#31E56F] shadow-none"
      aria-hidden="true"
    />
  );
}


function AdvanceIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5 12h12.5" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M13 6.75L18.25 12 13 17.25" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}



function getEndModalResultTitle(result) {
  const status = normalizeResultStatus(result?.status);
  const matchNo = Number(result?.matchNo || result?.fixture?.matchNo || 0);
  const won = Boolean(result?.won || result?.userWon);
  const draw = Boolean(result?.isDraw || Number(result?.homeGoals) === Number(result?.awayGoals));

  if (matchNo === 104) return won || status === RESULT_STATUS.CHAMPION ? "CHAMPIONS" : "RUNNER-UP";
  if (matchNo === 103) return won || status === RESULT_STATUS.THIRD_PLACE ? "THIRD-PLACE" : "DEFEAT";
  if (status === RESULT_STATUS.CHAMPION) return "CHAMPIONS";
  if (status === RESULT_STATUS.RUNNER_UP) return "RUNNER-UP";
  if (status === RESULT_STATUS.THIRD_PLACE) return "THIRD-PLACE";
  if (status === RESULT_STATUS.QUALIFIED || status === RESULT_STATUS.KNOCKOUT_WIN) return "QUALIFIED";
  if (status === RESULT_STATUS.ELIMINATED || status === RESULT_STATUS.THIRD_PLACE_PENDING || status === RESULT_STATUS.FOURTH_PLACE) return "ELIMINATED";
  if (draw) return "DRAW";
  return won ? "VICTORY" : "DEFEAT";
}

function getCampaignPointsTotal({ result, groupRows = [], userTeam = null, userForm = [] }) {
  const directValue = result?.campaignPoints ?? result?.pointsTotal ?? result?.leaderboardPoints ?? result?.totalPoints;
  if (Number.isFinite(Number(directValue))) return Number(directValue);

  const userRow = groupRows.find((row) => row.team === userTeam);
  const tablePoints = Number(userRow?.pts || 0);
  const formBonus = userForm.reduce((total, item) => {
    if (item === "W") return total + 3;
    if (item === "D") return total + 1;
    return total;
  }, 0);

  if (tablePoints || formBonus) return Math.max(tablePoints, formBonus);
  return 0;
}

function FormTracker({ form = [], className = "" }) {
  const ledClass = (value) => {
    if (value === "W") return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.85),0_0_22px_rgba(34,197,94,0.32)]";
    if (value === "L") return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85),0_0_22px_rgba(239,68,68,0.32)]";
    if (value === "D") return "bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.9),0_0_22px_rgba(247,209,23,0.34)]";
    return "bg-[#F7D117]/28 shadow-[0_0_6px_rgba(247,209,23,0.25)]";
  };

  return (
    <div className={`flex min-w-0 items-center justify-center gap-[clamp(7px,2.1vw,11px)] ${className}`}>
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} className={`block shrink-0 rounded-full ${ledClass(form[index])}`} style={{ height: "var(--result-rail-size)", width: "var(--result-rail-size)" }} />
      ))}
    </div>
  );
}

function ResultStatusRail({ form = [], points = 0 }) {
  return (
    <div
      className="mx-auto mb-[12px] flex h-[44px] w-[90%] min-w-0 items-center justify-center gap-[clamp(10px,3vw,16px)] overflow-hidden rounded-[0.48rem] border border-[#F5F1E8]/22 bg-[#050505]/62 px-[clamp(12px,3.2vw,18px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]"
      style={{ "--result-rail-size": "clamp(12px,3.4vw,18px)" }}
    >
      <FormTracker form={form} />
      <span className="block h-[58%] w-px shrink-0 bg-[#F5F1E8]/18" aria-hidden="true" />
      <span className="relative z-[1] inline-flex min-w-[42px] items-center justify-center font-led leading-none text-[#F7D117] led-text-glow tabular-nums" style={{ fontSize: "var(--result-rail-size)" }}>{Number(points || 0)}</span>
    </div>
  );
}

function cupRunMatchNumber(result = {}, fixture = {}) {
  const week = Number(result?.week || 0);
  if (week >= 1 && week <= 3) return week;

  const matchNo = Number(result?.matchNo || result?.fixture?.matchNo || fixture?.matchNo || 0);
  if (matchNo >= 73 && matchNo <= 88) return 4;
  if (matchNo >= 89 && matchNo <= 96) return 5;
  if (matchNo >= 97 && matchNo <= 100) return 6;
  if (matchNo >= 101 && matchNo <= 102) return 7;
  if (matchNo === 103 || matchNo === 104) return 8;

  return Math.max(1, Math.min(8, week || 1));
}

function cupRunOutcomeForResult(result = {}) {
  const draw = Boolean(result?.isDraw || Number(result?.homeGoals) === Number(result?.awayGoals));
  if (draw) return "D";

  const status = normalizeResultStatus(result?.status);
  if (result?.won || result?.userWon || status === RESULT_STATUS.QUALIFIED || status === RESULT_STATUS.KNOCKOUT_WIN || status === RESULT_STATUS.CHAMPION || status === RESULT_STATUS.THIRD_PLACE) return "W";
  if (result?.lost || result?.userLost || status === RESULT_STATUS.ELIMINATED || status === RESULT_STATUS.THIRD_PLACE_PENDING || status === RESULT_STATUS.RUNNER_UP || status === RESULT_STATUS.FOURTH_PLACE) return "L";

  return "";
}

function cupRunResultMeta(result = {}, currentMatch = 1, isKnockout = false) {
  const status = normalizeResultStatus(result?.status);
  const matchIndex = Number(currentMatch || 1);
  const matchNo = Number(result?.matchNo || result?.fixture?.matchNo || 0);
  const outcome = cupRunOutcomeForResult(result);
  const won = outcome === "W";
  const draw = outcome === "D";

  const title = (label = "", className = "text-[#F5F1E8]/72") => ({ label, className });

  if (!isKnockout) {
    if (matchIndex <= 2) {
      if (won) return title("VICTORY", "text-[#31E56F]");
      if (outcome === "L") return title("DEFEAT", "text-[#E94B43]");
      if (draw) return title("DRAW", "text-[#F7D117]");
      return title();
    }
    if (status === RESULT_STATUS.QUALIFIED || result?.qualified || result?.advanced) return title("QUALIFIED", "text-[#31E56F]");
    if (status === RESULT_STATUS.ELIMINATED || result?.eliminated || result?.lost || result?.userLost) return title("ELIMINATED", "text-[#E94B43]");
    return won ? title("QUALIFIED", "text-[#31E56F]") : title("ELIMINATED", "text-[#E94B43]");
  }

  if (matchNo === 104 || status === RESULT_STATUS.CHAMPION || status === RESULT_STATUS.RUNNER_UP) {
    if (won || status === RESULT_STATUS.CHAMPION) return title("CHAMPIONS!", "text-[#F7D117]");
    return title("RUNNER-UP", "text-[#D9E0DA]");
  }

  if (matchNo === 103 || status === RESULT_STATUS.THIRD_PLACE || status === RESULT_STATUS.FOURTH_PLACE) {
    if (won || status === RESULT_STATUS.THIRD_PLACE) return title("THIRD PLACE", "text-[#CD7F32]");
    return title("DEFEAT", "text-[#E94B43]");
  }

  if (matchNo >= 101 && matchNo <= 102) {
    if (won) return title("QUALIFIED", "text-[#31E56F]");
    return title("DEFEAT", "text-[#E94B43]");
  }

  if (status === RESULT_STATUS.QUALIFIED || status === RESULT_STATUS.KNOCKOUT_WIN || result?.qualified || result?.advanced || won) {
    return title("QUALIFIED", "text-[#31E56F]");
  }
  if (status === RESULT_STATUS.ELIMINATED || result?.eliminated || result?.lost || result?.userLost) {
    return title("ELIMINATED", "text-[#E94B43]");
  }

  return title();
}

function cupRunConnectorOutcome({ index, currentMatch = 1, result = {}, runForm = [], isKnockout = false, qualifiedTeams = new Set(), userTeam = null }) {
  const stepNumber = index + 1;
  const matchNo = Number(result?.matchNo || result?.fixture?.matchNo || 0);
  const status = normalizeResultStatus(result?.status);
  const currentOutcome = cupRunOutcomeForResult(result);
  const groupQualified = isTeamQualified(qualifiedTeams, userTeam);
  const followingMatchCompleted = Boolean(runForm[index + 1]);

  // A connector only represents confirmed progress once the following match node exists.
  // Example: after match 1, node 1 is coloured but connector 1→2 stays muted until match 2 is completed.
  if (!followingMatchCompleted) return "";

  // Group-stage matches 1 and 2 connect forward in yellow once the next group match has been completed.
  if (stepNumber <= 2) return "D";

  // After the 3rd group match, the connector into knockouts is based on group qualification,
  // not the result of a later knockout match. A user can win/lose the current knockout,
  // but the group-to-R32 connector should remain green if they reached the knockouts.
  if (stepNumber === 3) {
    if (groupQualified || status === RESULT_STATUS.QUALIFIED || result?.qualified || result?.advanced || isKnockout || currentMatch > 3) return "W";
    if (status === RESULT_STATUS.ELIMINATED || result?.eliminated || result?.lost || result?.userLost) return "L";
    return runForm[index] ? "L" : "";
  }

  // Semi-final: a defeat sends the user to the third-place playoff, so the connector is yellow.
  if (stepNumber === 7 && matchNo >= 101 && matchNo <= 102) return currentOutcome === "W" ? "W" : "D";

  // Earlier knockout wins progress, defeats eliminate.
  const outcome = stepNumber === currentMatch ? currentOutcome : runForm[index];
  if (outcome === "W") return "W";
  if (outcome === "L") return "L";
  if (outcome === "D") return "D";
  return "";
}

function CupRunProgressStrip({ matchNumber = 1, form = [], result = {}, isKnockout = false, qualifiedTeams = new Set(), userTeam = null, points = 0 }) {
  const currentMatch = Math.max(1, Math.min(8, Number(matchNumber || 1)));
  const steps = Array.from({ length: 8 });
  const matchNo = Number(result?.matchNo || result?.fixture?.matchNo || 0);
  const status = normalizeResultStatus(result?.status);
  const runForm = Array.isArray(form) ? form.slice(0, 8).map((value) => String(value || "").toUpperCase()) : [];
  const currentOutcome = cupRunOutcomeForResult(result);
  if (currentOutcome && !runForm[currentMatch - 1]) runForm[currentMatch - 1] = currentOutcome;

  const nodeClass = (outcome, isCurrent, stepNumber) => {
    const isFinal = matchNo === 104 && stepNumber === currentMatch;
    const isThirdPlace = matchNo === 103 && stepNumber === currentMatch;

    if (isFinal && (outcome === "W" || status === RESULT_STATUS.CHAMPION)) return "border border-[#F7D117] bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.58)]";
    if (isFinal && (outcome === "L" || status === RESULT_STATUS.RUNNER_UP)) return "border border-[#D9E0DA] bg-[#D9E0DA] shadow-[0_0_8px_rgba(217,224,218,0.42)]";
    if (isThirdPlace && (outcome === "W" || status === RESULT_STATUS.THIRD_PLACE)) return "border border-[#CD7F32] bg-[#CD7F32] shadow-[0_0_8px_rgba(205,127,50,0.50)]";

    if (outcome === "W") return "border border-[#31E56F] bg-[#31E56F] shadow-[0_0_7px_rgba(49,229,111,0.48)]";
    if (outcome === "D") return "border border-[#F7D117] bg-[#F7D117] shadow-[0_0_7px_rgba(247,209,23,0.48)]";
    if (outcome === "L") return "border border-[#E94B43] bg-[#E94B43] shadow-[0_0_7px_rgba(233,75,67,0.46)]";
    if (isCurrent) return "border-2 border-[#F7D117] bg-[#031B12] shadow-[0_0_9px_rgba(247,209,23,0.48),inset_0_0_0_2px_rgba(247,209,23,0.10)]";
    return "border border-[#F5F1E8]/10 bg-[#2D4A20]/72 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]";
  };

  const lineClass = (outcome) => {
    if (outcome === "W") return "bg-[#31E56F]/74 shadow-[0_0_5px_rgba(49,229,111,0.24)]";
    if (outcome === "D") return "bg-[#F7D117]/78 shadow-[0_0_5px_rgba(247,209,23,0.28)]";
    if (outcome === "L") return "bg-[#E94B43]/74 shadow-[0_0_5px_rgba(233,75,67,0.24)]";
    return "bg-[#F5F1E8]/12";
  };

  const rawOutcomeTitle = cupRunResultMeta(result, currentMatch, isKnockout);
  const fallbackOutcomeLabel = getEndModalResultTitle(result);
  const outcomeLabel = String(rawOutcomeTitle?.label || fallbackOutcomeLabel || "").trim();
  const outcomeClassName = rawOutcomeTitle?.label
    ? rawOutcomeTitle.className
    : outcomeLabel === "VICTORY" || outcomeLabel === "QUALIFIED" || outcomeLabel === "CHAMPIONS" || outcomeLabel === "CHAMPIONS!"
      ? "text-[#31E56F]"
      : outcomeLabel === "DRAW"
        ? "text-[#F7D117]"
        : outcomeLabel === "RUNNER-UP"
          ? "text-[#D9E0DA]"
          : outcomeLabel === "THIRD-PLACE" || outcomeLabel === "THIRD PLACE"
            ? "text-[#CD7F32]"
            : "text-[#E94B43]";
  const displayPoints = Number(points || 0);

  return (
    <div className="mt-2 rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]" aria-label={`Cup run progress. Match ${currentMatch} of 8`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-end px-[clamp(11px,3.1vw,15px)]">
            <div className="text-left home-copy-bold text-[clamp(11px,3vw,13px)] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]/88">CUP RUN</div>
            {outcomeLabel ? (
              <div className={`text-center home-copy-bold text-[clamp(10px,2.65vw,13px)] uppercase leading-none tracking-[0.16em] ${outcomeClassName}`}>{outcomeLabel}</div>
            ) : (
              <div aria-hidden="true" />
            )}
            <div className="text-right home-copy-bold text-[clamp(10px,2.65vw,12px)] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]/72">{currentMatch}/8</div>
          </div>
          <div className="relative min-w-0 rounded-xl border border-[#F5F1E8]/14 bg-[#052D1D]/68 px-[clamp(11px,3.1vw,15px)] py-[clamp(7px,2.1vw,9px)] text-[#F5F1E8] shadow-none ring-1 ring-[#F5F1E8]/10">
            <div className="flex w-full min-w-0 items-center" aria-hidden="true">
              {steps.map((_, index) => {
                const stepNumber = index + 1;
                const outcome = runForm[index];
                const isCurrent = stepNumber === currentMatch && !outcome;
                const connectorOutcome = cupRunConnectorOutcome({ index, currentMatch, result, runForm, isKnockout, qualifiedTeams, userTeam });
                return (
                  <div key={stepNumber} className="flex min-w-0 flex-1 items-center last:flex-none">
                    <span
                      className={`block shrink-0 rounded-full transition-none ${nodeClass(outcome, isCurrent, stepNumber)}`}
                      style={{ height: "clamp(8px,2.25vw,10px)", width: "clamp(8px,2.25vw,10px)" }}
                    />
                    {index < steps.length - 1 && (
                      <span className={`mx-[clamp(3px,1vw,5px)] block h-[2px] min-w-0 flex-1 rounded-full border-0 outline-none ${lineClass(connectorOutcome)}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="shrink-0 w-[86px]">
          <div className="mb-1.5 px-1 text-center home-copy-bold text-[clamp(11px,3vw,13px)] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]/88">GAME SCORE</div>
          <div className="inline-flex h-[clamp(24px,6.45vw,30px)] w-[86px] items-center justify-center rounded-[0.72rem] border border-[#F7D117]/28 bg-[#050505]/72 px-1 text-center shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/12">
            <span className="font-led text-[13px] font-black uppercase leading-none tracking-[-0.01em] text-[#F7D117] led-text-glow tabular-nums whitespace-nowrap">
              {displayPoints}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function markerForShareAttempt(attempt) {
  if (typeof attempt === "string") {
    const value = attempt.toUpperCase();
    if (value === "G" || value === "GOAL") return "G";
    if (value === "S" || value === "SAVE" || value === "SAVED" || value === "MISS" || value === "MISSED") return "S";
  }
  if (attempt?.goal === true || attempt?.result === "goal" || attempt?.shotResult === "goal") return "G";
  if (attempt?.goal === false || attempt?.result === "save" || attempt?.shotResult === "save" || attempt?.shotResult === "miss" || attempt?.result === "miss") return "S";
  return "";
}

function fallbackShareAttempts(goals = 0, slots = 5) {
  return Array.from({ length: slots }).map((_, index) => (index < Number(goals || 0) ? "G" : "S"));
}

function shareAttemptSequence(source = [], goals = 0) {
  const mapped = Array.isArray(source) ? source.map(markerForShareAttempt).filter(Boolean) : [];
  return mapped.length ? mapped : fallbackShareAttempts(goals);
}


function resultOutcomeCode(result) {
  if (result?.isDraw) return "D";
  if (result?.won || result?.userWon) return "W";
  return "L";
}

function teamRank(teamName) {
  return Number(TEAM_RANK[teamName] || 48);
}

function teamTier(teamName) {
  const rank = teamRank(teamName);
  if (rank <= 10) return "elite";
  if (rank <= 24) return "strong";
  return "underdog";
}

function opponentRankIsHigher(userTeamName, opponentTeamName) {
  return teamRank(opponentTeamName) < teamRank(userTeamName);
}

function deterministicIndex(seed, length) {
  if (!length) return 0;
  const text = String(seed || "MONDAY-CUP");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

function pickShareCopy(pool, seed) {
  return pool[deterministicIndex(seed, pool.length)] || pool[0] || "SHARE YOUR RESULT";
}

function pointsFromForm(form = []) {
  return form.reduce((total, code) => total + (code === "W" ? 3 : code === "D" ? 1 : 0), 0);
}

function rowStat(row = {}, keys = []) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return Number(value) || 0;
  }
  return 0;
}

function groupPositionForTeam(groupRows = [], teamName = "") {
  const index = groupRows.findIndex((row) => row.team === teamName);
  return index >= 0 ? index + 1 : null;
}

function groupRowForTeam(groupRows = [], teamName = "") {
  return groupRows.find((row) => row.team === teamName) || null;
}

function isTeamQualified(qualifiedTeams, teamName) {
  if (!qualifiedTeams || !teamName) return false;
  if (qualifiedTeams instanceof Set) return qualifiedTeams.has(teamName);
  if (Array.isArray(qualifiedTeams)) return qualifiedTeams.includes(teamName);
  return Boolean(qualifiedTeams[teamName]);
}

function wasNearGoalDifferenceExit(groupRows = [], teamName = "") {
  const position = groupPositionForTeam(groupRows, teamName);
  if (!position || position <= 2) return false;
  const userRow = groupRowForTeam(groupRows, teamName);
  const secondRow = groupRows[1];
  if (!userRow || !secondRow) return false;
  const userPts = rowStat(userRow, ["pts", "points", "P", "PTS"]);
  const secondPts = rowStat(secondRow, ["pts", "points", "P", "PTS"]);
  const userGd = rowStat(userRow, ["gd", "goalDifference", "GD"]);
  const secondGd = rowStat(secondRow, ["gd", "goalDifference", "GD"]);
  return Math.abs(secondPts - userPts) <= 1 && Math.abs(secondGd - userGd) <= 1;
}

function knockoutRoundKey(matchNo) {
  if (matchNo >= 73 && matchNo <= 88) return "r32";
  if (matchNo >= 89 && matchNo <= 96) return "r16";
  if (matchNo >= 97 && matchNo <= 100) return "qf";
  if (matchNo >= 101 && matchNo <= 102) return "sf";
  if (matchNo === 103) return "third";
  if (matchNo === 104) return "final";
  return "generic";
}

function exportFlashCopy({ result, userTeamName, opponentTeamName, userForm = [], groupRows = [], qualifiedTeams = new Set() }) {
  const status = normalizeResultStatus(result?.status);
  const matchNo = Number(result?.matchNo || 0);
  const won = Boolean(result?.won || result?.userWon);
  const outcome = resultOutcomeCode(result);
  const week = Number(result?.week || 0);
  const formThroughMatch = Array.isArray(userForm) && userForm.length
    ? userForm.slice(0, Math.max(week || userForm.length, userForm.length))
    : [outcome];
  const seed = `${matchNo}|${week}|${userTeamName}|${opponentTeamName}|${outcome}|${formThroughMatch.join("")}`;
  const userTier = teamTier(userTeamName);
  const opponentTier = teamTier(opponentTeamName);
  const giantKilling = won && userTier === "underdog" && opponentTier === "elite";
  const majorUpsetLoss = outcome === "L" && userTier === "elite" && opponentTier === "underdog";
  const lowerRankBeatHigher = won && opponentRankIsHigher(userTeamName, opponentTeamName);
  const isGroupMatch = week >= 1 && week <= 3 && (matchNo <= 72 || !matchNo);

  if (isGroupMatch) {
    const position = groupPositionForTeam(groupRows, userTeamName);
    const qualified = status === RESULT_STATUS.QUALIFIED || isTeamQualified(qualifiedTeams, userTeamName);
    const points = pointsFromForm(formThroughMatch.slice(0, Math.max(week, 1)));

    // Priority 1: exceptional group-stage storylines.
    if (giantKilling) return pickShareCopy(["A GIANT HAS FALLEN", "THE WORLD JUST TOOK NOTICE", "THEY NEVER SAW YOU COMING"], seed);
    if (majorUpsetLoss) return pickShareCopy(["THE NATION DEMANDS ANSWERS", "A DISASTER UNFOLDS", "HEADLINES WRITE THEMSELVES"], seed);
    if (week === 3 && points === 9) return pickShareCopy(["THREE GAMES. THREE WINS.", "PERFECTION.", "THE TEAM TO BEAT."], seed);
    if (week === 3 && outcome === "L" && qualified) return pickShareCopy(["DEFEAT NEVER FELT SO GOOD", "SOMEONE CHECK THE RULEBOOK", "YOU'LL TAKE THAT"], seed);
    if (week === 3 && !qualified && wasNearGoalDifferenceExit(groupRows, userTeamName)) return pickShareCopy(["MILLIMETRES FROM GLORY", "ONE GOAL CHANGED EVERYTHING", "SO CLOSE IT HURTS"], seed);

    if (week === 1) {
      if (outcome === "W") {
        if (lowerRankBeatHigher) return pickShareCopy(["DREAM START", "YOU'VE SHAKEN UP THE GROUP", "THE FAIRYTALE BEGINS"], seed);
        return pickShareCopy(["DREAM START", "OFF TO A FLYER", "THE JOURNEY BEGINS"], seed);
      }
      if (outcome === "L") {
        if (userTier === "underdog") return pickShareCopy(["NO SHAME IN THAT", "HEADS UP", "STILL ALL TO PLAY FOR"], seed);
        return pickShareCopy(["NOT THE BEST START", "WORK TO DO", "ALREADY UNDER PRESSURE"], seed);
      }
      return opponentRankIsHigher(userTeamName, opponentTeamName)
        ? pickShareCopy(["YOU'LL TAKE THAT", "A POINT EARNED", "STILL BREATHING"], seed)
        : pickShareCopy(["TWO POINTS DROPPED", "MISSED OPPORTUNITY", "YOU SHOULD HAVE FINISHED THEM"], seed);
    }

    if (week === 2) {
      if (points === 6) return pickShareCopy(["ONE FOOT IN THE KNOCKOUTS", "THEY CAN'T STOP YOU", "THE CROWD BELIEVES"], seed);
      if (points === 0) return pickShareCopy(["PRAY FOR A MIRACLE", "BACKS AGAINST THE WALL", "THE MOUNTAIN JUST GOT STEEPER"], seed);
      if (formThroughMatch[0] === "L" && outcome === "W") return pickShareCopy(["BACK FROM THE DEAD", "THE DREAM LIVES ON", "THAT'S MORE LIKE IT"], seed);
      if (userTier === "elite" && points <= 2) return pickShareCopy(["YOU'RE MAKING HARD WORK OF THIS", "THE PRESS ARE CIRCLING", "EXPECTATIONS ARE DROPPING"], seed);
      return pickShareCopy(["IT'S GOING TO THE WIRE", "EVERYTHING TO PLAY FOR", "STILL IN THE HUNT"], seed);
    }

    if (week === 3 || status === RESULT_STATUS.QUALIFIED || status === RESULT_STATUS.ELIMINATED) {
      if (qualified) {
        if (userTier === "underdog") return pickShareCopy(["THE DREAM CONTINUES", "NOBODY EXPECTED THIS", "THE NATION IS DANCING"], seed);
        if (position === 1) return pickShareCopy(["TOP OF THE PILE", "GROUP WINNERS", "YOU MADE IT LOOK EASY"], seed);
        if (position === 2) return pickShareCopy(["THROUGH IS THROUGH", "JOB DONE", "NOT PRETTY, BUT EFFECTIVE"], seed);
        return pickShareCopy(["THROUGH BY THE SKIN OF YOUR TEETH", "SOMEHOW, SOMEWAY", "NEVER IN DOUBT... HONESTLY"], seed);
      }
      if (userTier === "elite") return pickShareCopy(["THE NATION IS IN MOURNING", "YOU'VE LET THEM DOWN", "PACK YOUR BAGS"], seed);
      if (userTier === "strong") return pickShareCopy(["SO MUCH FOR THE PLAN", "NOT GOOD ENOUGH", "THE FLIGHT HOME AWAITS"], seed);
      return pickShareCopy(["HEADS HELD HIGH", "YOU GAVE IT A GO", "THE DREAM ENDS HERE"], seed);
    }
  }

  const round = knockoutRoundKey(matchNo);

  // Priority 1: knockout giant-killing/upset storylines.
  if (giantKilling) {
    if (round === "qf") return pickShareCopy(["A GIANT HAS BEEN SLAIN", "ANOTHER SCALP FOR THE COLLECTION", "THEY THOUGHT YOU WERE THE BYE"], seed);
    if (round === "sf") return pickShareCopy(["THE GIANTS KEEP FALLING", "WHO WRITES THIS SCRIPT?", "FROM OUTSIDERS TO FINALISTS"], seed);
    if (round === "final") return pickShareCopy(["FROM NOWHERE TO IMMORTALITY", "THE GREATEST STORY EVER TOLD", "THE IMPOSSIBLE IS REAL"], seed);
    return pickShareCopy(["YOU JUST SLAIN A GIANT", "ANOTHER GIANT FALLS", "THE FAIRYTALE CONTINUES"], seed);
  }
  if (majorUpsetLoss) return pickShareCopy(["THE NATION DEMANDS ANSWERS", "A DISASTER UNFOLDS", "HEADLINES WRITE THEMSELVES"], seed);

  if (round === "r32") return won
    ? pickShareCopy(["THE DREAM CONTINUES", "INTO THE LAST 16", "THE JOURNEY GOES ON"], seed)
    : pickShareCopy(["ELIMINATED IN THE ROUND OF 32", "PACK YOUR BAGS", "THE DREAM ENDS HERE"], seed);
  if (round === "r16") return won
    ? pickShareCopy(["THE PRESSURE IS BUILDING", "EIGHT REMAIN", "CLOSER THAN EVER"], seed)
    : pickShareCopy(["ELIMINATED IN THE ROUND OF 16", "SO CLOSE IT HURTS", "THE LAST 16 BITES BACK"], seed);
  if (round === "qf") return won
    ? pickShareCopy(["ONE GAME FROM GLORY", "THE NATION BELIEVES", "HISTORY BECKONS"], seed)
    : pickShareCopy(["ELIMINATED IN THE QUARTER-FINALS", "ONE STEP TOO FAR", "THE DREAM STOPS HERE"], seed);
  if (round === "sf") return won
    ? (userTier === "underdog" ? pickShareCopy(["FROM OUTSIDERS TO FINALISTS", "NOBODY CAN STOP YOU NOW", "THE DREAM IS STILL ALIVE"], seed) : pickShareCopy(["ONE HAND ON THE TROPHY", "MISSION ALMOST COMPLETE", "THE FINAL AWAITS"], seed))
    : pickShareCopy(["ELIMINATED IN THE SEMI-FINALS", "SO NEAR YET SO FAR", "THE FINAL SLIPPED AWAY"], seed);
  if (round === "third") return won
    ? pickShareCopy(["A PLACE ON THE PODIUM", "NOT A BAD CONSOLATION", "SOMETHING TO TAKE HOME"], seed)
    : pickShareCopy(["FOURTH IS THIRD'S UGLY COUSIN", "SO NEAR YET SO FAR", "THE WOODEN SPOON AWAITS"], seed);
  if (round === "final") return won
    ? (userTier === "underdog" ? pickShareCopy(["FROM NOWHERE TO IMMORTALITY", "THE GREATEST STORY EVER TOLD", "THE IMPOSSIBLE IS REAL"], seed) : pickShareCopy(["CHAMPIONS OF THE WORLD", "JUSTICE HAS BEEN SERVED", "THE BEST TEAM WON"], seed))
    : pickShareCopy(["SO CLOSE YOU COULD TASTE IT", "ONE STEP SHORT OF GREATNESS", "HEARTBREAK"], seed);

  if (status === RESULT_STATUS.KNOCKOUT_WIN) return pickShareCopy(["QUALIFIED FOR THE NEXT ROUND", "THE JOURNEY GOES ON", "STILL STANDING"], seed);
  if (status === RESULT_STATUS.ELIMINATED) return pickShareCopy(["ELIMINATED", "THE DREAM ENDS HERE", "PACK YOUR BAGS"], seed);
  if (outcome === "D") return pickShareCopy(["A POINT IS A POINT", "STILL IN THE HUNT", "EVERYTHING TO PLAY FOR"], seed);
  return won ? pickShareCopy(["DREAM START", "OFF TO A FLYER", "THE JOURNEY BEGINS"], seed) : pickShareCopy(["NOT THE BEST START", "WORK TO DO", "ALREADY UNDER PRESSURE"], seed);
}

function getResultShareState({ result, fixture = null, podium = null, userTeam, stageLabel, userForm = [], groupRows = [], qualifiedTeams = new Set(), username = "" }) {
  const home = result?.home || userTeam || "Team A";
  const away = result?.away || "Team B";
  const userIsHome = userTeam ? home === userTeam : true;
  const userIsAway = userTeam ? away === userTeam : false;
  const teamAName = userIsAway ? away : home;
  const teamBName = userIsAway ? home : away;
  const teamAGoals = Number(userIsAway ? result?.awayGoals : result?.homeGoals) || 0;
  const teamBGoals = Number(userIsAway ? result?.homeGoals : result?.awayGoals) || 0;
  const teamA = teamToGameTeam(teamAName);
  const teamB = teamToGameTeam(teamBName);
  const attempts = result?.attempts || {};
  const teamAAttempts = userIsAway || userIsHome ? attempts.user : attempts.home;
  const teamBAttempts = userIsAway || userIsHome ? attempts.opponent : attempts.away;
  const teamAMarkers = shareAttemptSequence(teamAAttempts, teamAGoals);
  const teamBMarkers = shareAttemptSequence(teamBAttempts, teamBGoals);
  const totalMarkerSlots = Math.max(5, teamAMarkers.length, teamBMarkers.length);
  const stageTitle = result?.week ? "GROUP STAGE" : normaliseThirdPlaceCopy(stageLabel || "KNOCKOUT");
  const flashText = exportFlashCopy({ result, userTeamName: teamAName, opponentTeamName: teamBName, userForm, groupRows, qualifiedTeams });
  const cleanUsername = String(username || "").replace(/\s+/g, " ").trim().toUpperCase() || "GUEST";

  return {
    userTeam: teamA,
    opponentTeam: teamB,
    score: { user: teamAGoals, opponent: teamBGoals },
    stageTitle,
    flashText,
    flashStyle: { background: teamA.primaryColour, color: teamA.textColour },
    crowdStage: stageTitle,
    showMarkers: true,
    markerText: "PENALTIES",
    usernameEnabled: true,
    username: cleanUsername,
    teamAMarkers,
    teamBMarkers,
    totalMarkerSlots,
    badgeMode: getPodiumBadgeMode({ result, fixture, stageLabel, podium, team: userTeam }) || "monday",
    showGoalkeeper: false,
    goalkeeperPosition: "CM",
    showBall: false,
    ballPosition: "spot",
    matchDesign: {
      scoreboardHeight: 34,
      textColour: "#F7D117",
      fontType: "led",
      showStage: true,
      stageBox: true,
      showFlags: true,
      showTeamCodes: true,
      showScore: true,
      scoreDisplayMode: "score",
      markerBox: false,
      markerScale: 1,
      flashBox: true,
      flashFontType: "bold",
      flashScale: 1,
      pitchHeight: 620,
      badgeScale: 1.01,
      badgeX: 0,
      badgeY: 0,
    },
  };
}


function StandingsMiniTable({ title = "GROUP", rows = [], qualifiedTeams = new Set(), userTeam = null }) {
  if (!rows.length) return null;

  const tableColumns = "20px 30px minmax(0, 1fr) 14px 18px 18px 18px 18px 20px 24px";
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);

  return (
    <div className="mt-0 overflow-visible rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 px-2 pb-1.5 pt-2 text-[#F5F1E8] shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
      <div className="mb-2 text-center home-copy-bold text-[clamp(15px,4.1vw,19px)] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">
        {title}
      </div>
      <div className="grid gap-[3px] px-2 pb-[4px] pt-1 text-center text-[9px] home-copy-bold uppercase leading-none tracking-[0.1em] text-[#F5F1E8]/72 tabular-nums" style={{ gridTemplateColumns: tableColumns }}>
        <span>#</span><span className="text-center">TEAM</span><span aria-hidden="true" /><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>PTS</span>
      </div>
      {rows.map((row, index) => {
        const isUser = row.team === userTeam;
        const isQualified = qualifiedTeams.has(row.team);
        return (
          <div key={row.team} className={`mb-1 grid items-center gap-[3px] rounded-xl border px-2 py-[5px] text-center text-[12px] leading-none last:mb-0 ring-1 shadow-none tabular-nums ${isUser ? "border-[#F7D117]/72 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F7D117]/32 shadow-none" : "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10"}`} style={{ gridTemplateColumns: tableColumns }}>
            <span className="home-copy-regular text-[#F5F1E8]">{index + 1}</span>
            <span className="flex justify-center"><Flag team={row.team} className={`h-4 w-6 rounded-[4px] ring-1 ${isUser ? "ring-[#F7D117]/85" : "ring-[#F5F1E8]/35"}`} /></span>
            <span className={`min-w-0 truncate pl-2 text-left uppercase home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`} style={tightTeamStyle(row.team)}>{row.team}</span>
            <span className="flex h-[16px] w-full items-center justify-center text-center text-[10px] home-copy-regular font-black leading-[10px] text-[#F7D117]">{isQualified ? "Q" : ""}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>{row.played}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>{row.won}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>{row.drawn}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>{row.lost}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>{row.gd}</span>
            <span className={`home-copy-bold ${isUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>{row.pts}</span>
          </div>
        );
      })}
    </div>
  );
}


function ChampionConfetti({ count = 92 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${3 + Math.random() * 94}%`,
    delay: `${Math.random() * 0.7}s`,
    duration: `${3.1 + Math.random() * 1.35}s`,
    drift: `${(Math.random() - 0.5) * 150}px`,
    rotate: `${Math.random() * 720 - 360}deg`,
    width: `${5 + Math.random() * 5}px`,
    height: `${9 + Math.random() * 12}px`,
    start: `${-18 - Math.random() * 30}%`,
  })), [count]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes championConfettiFall {
          0% { opacity: 0; transform: translate3d(0, -18%, 0) rotate(0deg); }
          8% { opacity: 1; }
          78% { opacity: 0.95; }
          100% { opacity: 0; transform: translate3d(var(--drift), 124dvh, 0) rotate(var(--rotate)); }
        }
        @keyframes championConfettiShine {
          0%, 100% { filter: brightness(0.95) saturate(1.05); }
          45% { filter: brightness(1.65) saturate(1.35); }
        }
      `}</style>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 block rounded-[2px] shadow-[0_0_8px_rgba(247,209,23,0.38)]"
          style={{
            left: piece.left,
            top: piece.start,
            width: piece.width,
            height: piece.height,
            background: "linear-gradient(115deg,#fff7b0 0%,#f7d117 32%,#b98a08 58%,#fff1a0 76%,#d2a20a 100%)",
            animation: `championConfettiFall ${piece.duration} cubic-bezier(0.16,0.78,0.28,1) ${piece.delay} 1 forwards, championConfettiShine 0.72s ease-in-out ${piece.delay} 5 alternate`,
            "--drift": piece.drift,
            "--rotate": piece.rotate,
          }}
        />
      ))}
    </div>
  );
}

function EndMatchModal({ result, fixture, onNext, onChangeTeams, onDismiss, onOpenMenu, onOpenTrophies, hasNewTrophy = false, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel, userForm, shareCaptureRef, podium, username = "", twoPlayerMode = false }) {
  const isKnockout = !result.week;
  const userInKnockout = result.home === userTeam || result.away === userTeam;
  const homeIsUser = result.home === userTeam;
  const awayIsUser = result.away === userTeam;
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);
  const shareFrameRef = useRef(null);
  const shareBlobPromiseRef = useRef(null);
  const [shareBlob, setShareBlob] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const canShareResult = Boolean(result);
  const currentCupRunMatch = cupRunMatchNumber(result, fixture);
  const fixtureMatchNo = Number(result?.matchNo || fixture?.matchNo || result?.fixture?.matchNo || 0);
  const phaseTitle = "FULL TIME";
  const campaignPointsTotal = getCampaignPointsTotal({ result, groupRows, userTeam, userForm });
  const activeBadgeMode = getPodiumBadgeMode({ result, fixture, stageLabel, podium, team: userTeam });
  const resultShareState = useMemo(() => getResultShareState({ result, fixture, podium, userTeam, stageLabel, userForm, groupRows, qualifiedTeams, username }), [result, fixture, podium, userTeam, stageLabel, userForm, groupRows, qualifiedTeams, username]);
  const resultActionButtonClass = "mx-auto grid h-[clamp(48px,5.6dvh,66px)] min-h-[48px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[clamp(14px,2dvh,23px)] font-black uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65";
  const resultIconButtonClass = "grid h-[clamp(48px,5.6dvh,66px)] min-h-[48px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.22),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65";
  const resultSquareButtonClass = "grid h-[44px] min-h-[44px] w-[44px] min-w-[44px] place-items-center rounded-[0.85rem] border border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.22),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65";
  const resultAdvanceButtonClass = "flex h-[44px] min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.85rem] border border-[#F5F1E8]/45 bg-[#F7D117] px-2.5 text-center home-copy-bold text-[clamp(10px,2.8vw,12px)] font-black uppercase leading-none tracking-[0.09em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.22),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65";
  const resultControlGridClass = "grid grid-cols-[44px_44px_44px_minmax(0,1fr)] items-center justify-items-stretch gap-2";
  const resultButtonsBoxClass = "mt-2 rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 p-2.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]";
  const resultMetricBoxClass = "inline-flex h-[44px] min-h-[44px] min-w-[70px] items-center justify-center rounded-[0.9rem] border border-[#F7D117]/35 bg-[#031B12]/62 px-3 text-center shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/18";
  const resultFormGuideBoxClass = "inline-flex h-[44px] min-w-0 items-center justify-center rounded-[0.9rem] border border-[#F7D117]/35 bg-[#031B12]/62 px-3 text-center shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/18";
  const resultHeaderStatsClass = "flex min-w-0 max-w-full items-center justify-center gap-2 overflow-hidden";
  const buildShareBlob = () => {
    const exportNode = shareFrameRef.current;
    if (!exportNode) throw new Error("Match share exporter was not ready");
    if (!shareBlobPromiseRef.current) {
      shareBlobPromiseRef.current = createMatchShareBlob(resultShareState || {}, { sourceElement: exportNode })
        .finally(() => {
          shareBlobPromiseRef.current = null;
        });
    }
    return shareBlobPromiseRef.current;
  };

  useEffect(() => {
    shareBlobPromiseRef.current = null;
    setShareBlob(null);
    setSharePreparing(false);
    setSharePreviewOpen(false);
  }, [result, resultShareState]);

  const ensureShareBlob = async () => {
    if (shareBlob) return shareBlob;
    const blob = await buildShareBlob();
    setShareBlob(blob);
    return blob;
  };

  useEffect(() => {
    if (!sharePreviewOpen || shareBlob) return undefined;
    let cancelled = false;
    let secondFrame = 0;
    setSharePreparing(true);
    warmShareExportRenderer();
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(async () => {
        try {
          if (cancelled || !shareFrameRef.current) return;
          const blob = await buildShareBlob();
          if (!cancelled) setShareBlob(blob);
        } catch (error) {
          console.warn("Share preview pre-render failed", error);
        } finally {
          if (!cancelled) setSharePreparing(false);
        }
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [sharePreviewOpen, shareBlob, resultShareState]);

  const openSharePreview = () => {
    // Keep html2canvas warm for non-match share fallbacks, but the match result
    // export now uses the dedicated canvas renderer below so iOS is not asked to
    // screenshot a complex DOM tree.
    warmShareExportRenderer();
    setSharePreviewOpen(true);
  };

  const handleShare = async () => {
    if (shareBusy || sharePreparing) return;
    setShareBusy(true);
    try {
      const blob = shareBlob || await ensureShareBlob();
      try {
        await shareNativeImage(blob, "monday-cup-result.png", {
          title: "Monday Cup Result",
          text: "My Monday Cup result",
        });
      } catch (nativeError) {
        if (nativeError?.name === "AbortError") return;
        console.warn("Native result share unavailable, falling back", nativeError);
        await shareOrDownloadResult({ blob, filename: "monday-cup-result.png" });
      }
    } catch (error) {
      console.error("Share result failed", error);
      window.alert("Sorry, the result image could not be shared. Please try again.");
    } finally {
      setShareBusy(false);
    }
  };



  const groupTitleSuffix = String(selectedGroup || result?.group || result?.groupId || "").replace(/^GROUP\s*/i, "").trim();
  const groupBoxTitle = groupTitleSuffix ? `GROUP ${groupTitleSuffix}` : "GROUP";
  const twoPlayerWinnerTitle = result?.userWon ? "PLAYER 1 WINS" : "PLAYER 2 WINS";
  const twoPlayerWinnerTeam = twoPlayerMode ? (result?.userWon ? "home" : "away") : null;
  const twoPlayerFixtureRingClass = twoPlayerMode
    ? "border-[#F7D117]/82 ring-[#F7D117]/32"
    : "border-[#F7D117]/72 ring-[#F7D117]/32";
  const knockoutRoundTitle = twoPlayerMode
    ? twoPlayerWinnerTitle
    : normaliseThirdPlaceCopy(modalHeaderTitle({ isKnockout: true, stageLabel, selectedGroup }));
  const knockoutMatchNo = fixtureMatchNo;
  const rawKnockoutMatchId = String(result?.matchId || fixture?.matchId || fixture?.id || "").trim().toUpperCase();
  const knockoutMatchLabel = twoPlayerMode
    ? "SHOOTOUT"
    : knockoutMatchNo
      ? `MATCH ${knockoutMatchNo}`
      : rawKnockoutMatchId.replace(/^M(\d+)$/i, "MATCH $1");
  const knockoutStadium = twoPlayerMode ? "mondaycup.co.uk" : fixtureVenueName(knockoutMatchNo, fixture, result);
  const headerTitle = sharePreviewOpen ? "SHARE" : phaseTitle;
  const headerTitleClass = "home-copy-bold text-center text-[clamp(20px,5.4vw,25px)] uppercase leading-none tracking-[0.1em] text-[#F5F1E8]";
  const showRewardDot = Boolean(hasNewTrophy);
  const handleResultNav = (event) => {
    event?.stopPropagation?.();
    onOpenMenu?.();
  };
  const twoPlayerControlButtonClass = `${resultAdvanceButtonClass} min-w-0 justify-center px-2 text-[clamp(9px,2.45vw,11px)] tracking-[0.07em]`;
  const resultControls = twoPlayerMode ? (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={onDismiss}
        className={twoPlayerControlButtonClass}
        aria-label="Exit shootout"
        title="Exit"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onChangeTeams || onDismiss}
        className={twoPlayerControlButtonClass}
        aria-label="Change teams"
        title="Change teams"
      >
        <span className="min-w-0 truncate">CHANGE TEAMS</span>
      </button>
      <button
        type="button"
        onClick={onNext}
        className={twoPlayerControlButtonClass}
        aria-label="Replay shootout"
        title="Replay"
      >
        <TickIcon className="h-5 w-5" />
      </button>
    </div>
  ) : (
    <div className={resultControlGridClass}>
      <button type="button" onClick={handleResultNav} className={resultSquareButtonClass} aria-label="Open menu">
        <MenuIcon />
      </button>
      <button type="button" onClick={onOpenTrophies || undefined} className={`${resultSquareButtonClass} relative`} aria-label="Open sticker book">
        <TrophyIcon />
        {showRewardDot && <RewardNoticeDot />}
      </button>
      <button type="button" onClick={openSharePreview} disabled={!canShareResult || shareBusy} className={resultSquareButtonClass} aria-label="Share result">
        <ShareIcon />
      </button>
      <button type="button" onClick={onNext} disabled={false} className={resultAdvanceButtonClass} aria-label={modalButton(result)}>
        <span className="min-w-0 truncate">{modalButton(result)}</span>
        <AdvanceIcon className="h-5 w-5 shrink-0" />
      </button>
    </div>
  );
  const resultButtonsPanel = (
    <div className={resultButtonsBoxClass}>
      {twoPlayerMode && (
        <div className="mb-2 text-center home-copy-bold text-[clamp(10px,2.7vw,12px)] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]/78">
          REPLAY
        </div>
      )}
      {resultControls}
    </div>
  );

  return (
    <div className="fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#031B12]/45 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-[4px]" style={{ zIndex: 2147483647 }}>
      {activeBadgeMode === PODIUM_BADGE_MODE.CHAMPION && <ChampionConfetti />}
      <div className="relative z-[1] flex w-full max-w-[408px] flex-col items-stretch">
        <div
          className="relative w-full overflow-hidden rounded-[2rem] border border-[#F5F1E8]/14 text-center text-[#F5F1E8] shadow-[0_24px_54px_rgba(0,0,0,0.36),inset_0_-2px_6px_rgba(0,0,0,0.08)]"
          style={{
            backgroundColor: "#0B5F35",
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)",
            backgroundSize: "100% 100%",
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_18%_8%,rgba(247,209,23,0.10),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.09))]" aria-hidden="true" />
          <div className="relative p-3">
            <div className="mb-0 grid h-[58px] grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
              {sharePreviewOpen ? (
                <button type="button" onClick={() => setSharePreviewOpen(false)} aria-label="Back to result options" className="grid h-10 w-10 place-items-center justify-self-start rounded-[0.85rem] bg-[#031B12]/46 text-[#F5F1E8]">
                  <BackArrowIcon className="h-7 w-7" />
                </button>
              ) : (
                <div className="grid h-10 w-10 place-items-center justify-self-start">
                  <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.3)]" draggable={false} />
                </div>
              )}
              <div className="flex min-w-0 items-center justify-center self-center overflow-hidden">
                <div className={headerTitleClass}>{headerTitle}</div>
              </div>
              <button type="button" onClick={onDismiss} aria-label="Close result" className="grid h-10 w-10 place-items-center justify-self-end rounded-[0.85rem] border border-[#F5F1E8]/10 bg-[#031B12]/46 text-[#F5F1E8]">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>


            {sharePreviewOpen ? (
              <div className="rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 p-2.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
                <div className="space-y-5">
                  <div className="mx-auto aspect-square w-full overflow-hidden rounded-[1.1rem] border border-[#F5F1E8]/10 bg-[#0d6c3d] shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" data-share-layout="match-preview-modal">
                    <div ref={shareFrameRef} data-share-layout="match" className="h-full w-full overflow-hidden bg-[#0d6c3d]">
                      <ShareMatchPreview {...resultShareState} />
                    </div>
                  </div>
                  <ExportButton
                    onClick={handleShare}
                    disabled={shareBusy || sharePreparing || !shareBlob}
                    primary
                    icon={<ShareIcon className="h-5 w-5" />}
                    label="Share"
                    busy={shareBusy || sharePreparing || !shareBlob}
                    className="max-w-[318px]"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-[calc(100dvh-342px)] overflow-y-auto pb-0">
                  {isKnockout ? (
                    <div className="rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 px-2.5 pb-1.5 pt-2.5 text-[#F5F1E8] shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
                      <div className="mb-2 text-center home-copy-bold text-[clamp(15px,4.1vw,19px)] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">
                        {twoPlayerMode ? (
                          <>
                            <span className="text-[#F7D117]">PLAYER {result?.userWon ? "1" : "2"}</span>
                            <span className="text-[#F5F1E8]"> WINS</span>
                          </>
                        ) : knockoutRoundTitle}
                      </div>
                      <div className={`grid min-h-[70px] grid-rows-[30%_40%_30%] rounded-[1.1rem] border px-2.5 ring-1 shadow-none ${twoPlayerMode ? `${twoPlayerFixtureRingClass} bg-[#052D1D]/68 text-[#F5F1E8]` : userInKnockout ? "border-[#F7D117]/72 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F7D117]/32 shadow-none" : "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10"}`}>
                        {knockoutMatchLabel && (
                          <div className="flex items-end justify-center self-stretch pb-[3px] text-center home-copy-bold text-[clamp(10px,2.8vw,12px)] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]/72">
                            {knockoutMatchLabel}
                          </div>
                        )}
                        <div className="grid min-h-0 grid-cols-[24px_minmax(0,1fr)_32px_minmax(0,1fr)_24px] items-center gap-1 self-stretch home-main-font text-[clamp(13px,3.4vw,15px)] uppercase leading-none text-[#F5F1E8]">
                          <div className="flex items-center justify-center"><Flag team={result.home} className={`h-[18px] w-[25px] rounded-[4px] ring-1 ${twoPlayerMode ? "ring-[#F7D117]/90" : homeIsUser ? "ring-[#F7D117]/85" : "ring-[#F5F1E8]/35"}`} /></div>
                          <span className={`block min-w-0 truncate text-center home-copy-regular ${twoPlayerMode ? (twoPlayerWinnerTeam === "home" ? "text-[#F7D117]" : "text-[#F5F1E8]") : homeIsUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`} style={{ ...tightTeamStyle(result.home) }} title={result.home}>{result.home}</span>
                          <span className="flex items-center justify-center home-copy-bold tabular-nums leading-none text-[#F5F1E8]">{result.homeGoals}-{result.awayGoals}</span>
                          <span className={`block min-w-0 truncate text-center home-copy-regular ${twoPlayerMode ? (twoPlayerWinnerTeam === "away" ? "text-[#F7D117]" : "text-[#F5F1E8]") : awayIsUser ? "text-[#F7D117]" : "text-[#F5F1E8]"}`} style={{ ...tightTeamStyle(result.away) }} title={result.away}>{result.away}</span>
                          <div className="flex items-center justify-center"><Flag team={result.away} className={`h-[18px] w-[25px] rounded-[4px] ring-1 ${twoPlayerMode ? "ring-[#F7D117]/90" : awayIsUser ? "ring-[#F7D117]/85" : "ring-[#F5F1E8]/35"}`} /></div>
                        </div>
                        {knockoutStadium && (
                          <div className={`flex items-start justify-center self-stretch pt-[3px] text-center home-copy-regular text-[clamp(10px,2.8vw,12px)] leading-none tracking-[0.14em] ${twoPlayerMode ? "normal-case text-[#F5F1E8]/78" : "uppercase text-[#F5F1E8]/72"}`}>
                            {twoPlayerMode ? (
                              <span aria-label="mondaycup.co.uk">
                                <span>monday</span><span className="text-[#F7D117]">cup</span><span>.co.uk</span>
                              </span>
                            ) : knockoutStadium}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <StandingsMiniTable title={groupBoxTitle} rows={groupRows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />
                    </>
                  )}
                </div>
                {!twoPlayerMode && (
                  <CupRunProgressStrip matchNumber={currentCupRunMatch} form={userForm} result={result} isKnockout={isKnockout} qualifiedTeams={qualifiedTeams} userTeam={userTeam} points={campaignPointsTotal} />
                )}
                {resultButtonsPanel}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}


export default EndMatchModal;
