import { GAME } from "../../logic/penaltyEngine.js";
import { LED_YELLOW } from "./shareConstants.js";

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

export function MarkerDots({ markers = [], totalSlots = GAME.regulationPens }) {
  const MAX_VISIBLE_MARKERS = 10;
  const displaySlots = Math.min(totalSlots, MAX_VISIBLE_MARKERS);
  const sourceMarkers = Array.isArray(markers) ? markers : [];
  const startIndex = totalSlots > MAX_VISIBLE_MARKERS ? Math.max(0, sourceMarkers.length - MAX_VISIBLE_MARKERS) : 0;
  const visible = padMarkers(sourceMarkers.slice(startIndex, startIndex + displaySlots), displaySlots);
  return (
    <div className="inline-flex min-w-0 justify-center gap-[3px]">
      {visible.map((marker, index) => {
        const colour = marker === "G" ? "bg-green-500" : marker === "S" ? "bg-red-500" : "bg-[#F7D117]";
        return <span key={`${marker}-${index}`} data-share-marker-dot="true" className={`shrink-0 rounded-full ${colour}`} style={{ width: 6, height: 6, flex: "0 0 6px", boxShadow: "0 0 2px rgba(247,209,23,0.10)", filter: "none" }} />;
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
