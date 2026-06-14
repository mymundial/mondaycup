import { GAME } from "/src/logic/penaltyEngine.js";

const LED_YELLOW = "#F7D117";

export function scoreFromProps({ team, opponent, score, matchResult }) {
  if (matchResult?.home && matchResult?.away) {
    const userIsHome = matchResult.home === team;
    return {
      user: Number(userIsHome ? matchResult.homeGoals : matchResult.awayGoals) || 0,
      opponent: Number(userIsHome ? matchResult.awayGoals : matchResult.homeGoals) || 0,
    };
  }

  if (Array.isArray(score)) {
    return {
      user: Number(score[0]) || 0,
      opponent: Number(score[1]) || 0,
    };
  }

  return { user: 0, opponent: 0 };
}

export function markerForAttempt(attempt) {
  if (typeof attempt === "string") {
    const value = attempt.toUpperCase();
    if (value === "G" || value === "GOAL") return "G";
    if (value === "S" || value === "SAVE" || value === "SAVED") return "S";
  }
  if (attempt?.goal === true || attempt?.result === "goal" || attempt?.shotResult === "goal") return "G";
  if (attempt?.goal === false || attempt?.result === "save" || attempt?.shotResult === "save") return "S";
  return "";
}

export function fallbackAttemptsFromScore(goals = 0, slots = GAME.regulationPens) {
  return Array.from({ length: slots }).map((_, index) => (index < goals ? "G" : "S"));
}

export function initialAttemptSequence(source = [], goals = 0) {
  const mapped = Array.isArray(source) ? source.map(markerForAttempt).filter(Boolean) : [];
  return mapped.length ? mapped : fallbackAttemptsFromScore(goals);
}

export function padMarkers(sequence = [], totalSlots = GAME.regulationPens) {
  return Array.from({ length: totalSlots }).map((_, index) => sequence[index] || "");
}

export function previewTicker({ team, opponent, matchResult }) {
  if (!matchResult) return "SHARE YOUR RESULT";
  if (matchResult.isDraw) return "DRAW!";
  if (matchResult.winner) return `${String(matchResult.winner).toUpperCase()} WINS!`;
  return `${String(matchResult.won ? team : opponent).toUpperCase()} WINS!`;
}

export function fontFamilyFor(value) {
  if (value === "led") return 'IntoDotMatrix, monospace';
  if (value === "light") return 'SportsDINLight, SportsDINRegular, sans-serif';
  if (value === "regular") return 'SportsDINRegular, sans-serif';
  return 'SportsDINBold, SportsDINRegular, sans-serif';
}

export function backgroundFor(mode, team, custom) {
  if (mode === "team") return team.primaryColour;
  if (mode === "custom") return custom;
  return "#0d6c3d";
}

export function hexWithAlpha(hex, alpha = 1) {
  const clean = String(hex || "#F7D117").replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean.padEnd(6, "0").slice(0, 6);
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, Number(alpha)))})`;
}

export function TeamFlag({ team, className = "h-4 w-6", style = null }) {
  if (!team.flag) return null;
  return <img src={team.flag} alt={`${team.name} flag`} className={`${className} rounded-[4px] border border-[#F7D117]/90 object-cover bg-[#F5F1E8] outline outline-1 outline-[#F7D117]/85 outline-offset-0`} style={{ boxShadow: "0 0 3px rgba(247,209,23,0.16), inset 0 0 0 1px rgba(3,27,18,0.28)", ...(style || {}) }} draggable={false} crossOrigin="anonymous" />;
}

export function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function editorTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate(${Number(x) || 0}px, ${Number(y) || 0}px) scale(${Number(scale) || 1})`;
}

export function textStroke(weight = 0, colour = LED_YELLOW) {
  const px = clampNumber(weight, 0, 16, 0);
  return px > 0 ? `${px}px ${colour || LED_YELLOW}` : "0 transparent";
}

export function mergeTransforms(...parts) {
  return parts.filter(Boolean).join(" ");
}

const SHARE_MARKER_MIN_VISIBLE = GAME.regulationPens;
const SHARE_MARKER_MAX_VISIBLE = 11;

function visiblePenaltySlotCount(markers = [], totalSlots = GAME.regulationPens) {
  const sourceCount = Array.isArray(markers) ? markers.map(markerForAttempt).filter(Boolean).length : 0;
  const requestedSlots = Math.max(SHARE_MARKER_MIN_VISIBLE, Number(totalSlots) || 0, sourceCount);
  return Math.min(SHARE_MARKER_MAX_VISIBLE, requestedSlots);
}

export function buildSharePenaltyMarkers(markers = [], totalSlots = GAME.regulationPens, goals = 0) {
  const mapped = Array.isArray(markers) ? markers.map(markerForAttempt).filter(Boolean) : [];
  const visibleSlots = visiblePenaltySlotCount(mapped, totalSlots);

  if (mapped.length > visibleSlots) {
    return mapped.slice(-visibleSlots);
  }

  const visible = mapped.slice(0, visibleSlots);
  const missing = visibleSlots - visible.length;
  if (missing <= 0) return visible;

  const targetGoals = clampNumber(goals, 0, visibleSlots, 0);
  const goalsAlreadyVisible = visible.filter((marker) => marker === "G").length;
  const goalsToAdd = clampNumber(targetGoals - goalsAlreadyVisible, 0, missing, 0);

  return [
    ...visible,
    ...Array.from({ length: goalsToAdd }, () => "G"),
    ...Array.from({ length: missing - goalsToAdd }, () => "S"),
  ];
}

export function MarkerDots({ markers = [], totalSlots = GAME.regulationPens, goals = 0 }) {
  const visible = buildSharePenaltyMarkers(markers, totalSlots, goals);
  return (
    <div className="inline-flex flex-none items-center justify-center gap-[2.5px] overflow-visible whitespace-nowrap" style={{ flex: "0 0 auto" }}>
      {visible.map((marker, index) => {
        const colour = marker === "G" ? "bg-green-500" : "bg-red-500";
        return <span key={`${marker}-${index}`} data-share-marker-dot="true" className={`block shrink-0 rounded-full ${colour}`} style={{ width: 5.25, height: 5.25, flex: "0 0 5.25px", boxShadow: "0 0 2px rgba(247,209,23,0.10)", filter: "none" }} />;
      })}
    </div>
  );
}

export function flashTickerFontSize() {
  return "20px";
}


export function padArray(values = [], length, fallback = []) {
  return Array.from({ length }).map((_, index) => values[index] || fallback[index] || `TEAM ${index + 1}`);
}
