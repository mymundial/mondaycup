import { ASSETS } from "../../data/assets.js";
import { RESULT_STATUS, normalizeResultStatus } from "../../logic/resultStatus.js";

function getMatchNo(result = {}, fixture = {}) {
  const value = result?.matchNo ?? fixture?.matchNo;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getResultBadge({ result = null, fixture = null, stageLabel = "" } = {}) {
  if (!result) return null;
  const status = normalizeResultStatus(result.status);
  const matchNo = getMatchNo(result, fixture);
  const didWin = Boolean(result.userWon ?? result.won);

  if (status === RESULT_STATUS.CHAMPION || matchNo === 104 && didWin) {
    return { id: "champion", title: "CHAMPIONS", subtitle: "MONDAY CUP WINNERS", image: ASSETS.badges.champion, tone: "gold" };
  }
  if (status === RESULT_STATUS.RUNNER_UP || matchNo === 104 && didWin === false) {
    return { id: "runnerUp", title: "RUNNER-UP", subtitle: "FINALIST", image: ASSETS.badges.runnerUp, tone: "silver" };
  }
  if (status === RESULT_STATUS.THIRD_PLACE || matchNo === 103 && didWin) {
    return { id: "third", title: "THIRD PLACE", subtitle: "PODIUM FINISH", image: ASSETS.badges.third, tone: "bronze" };
  }
  if (status === RESULT_STATUS.FOURTH_PLACE || matchNo === 103 && didWin === false) {
    return { id: "fourth", title: "FOURTH", subtitle: "PLAY-OFF DEFEAT", symbol: "4", tone: "red" };
  }
  if (status === RESULT_STATUS.THIRD_PLACE_PENDING) {
    return { id: "woodenSpoon", title: "WOODEN-SPOON", subtitle: "THIRD PLACE PLAY-OFF", symbol: "WS", tone: "bronze" };
  }
  if (status === RESULT_STATUS.ELIMINATED) {
    return { id: "eliminated", title: "ELIMINATED", subtitle: "CUP RUN ENDS", symbol: "×", tone: "red" };
  }
  if (status === RESULT_STATUS.QUALIFIED) {
    return { id: "qualifiedR32", title: "QUALIFIED R32", subtitle: "GROUP ESCAPE", symbol: "32", tone: "green" };
  }
  if (status === RESULT_STATUS.KNOCKOUT_WIN) {
    if (matchNo >= 101 && matchNo <= 102) return { id: "qualifiedFinal", title: "QUALIFIED FINAL", subtitle: "ONE MATCH FROM GLORY", symbol: "F", tone: "gold" };
    if (matchNo >= 97 && matchNo <= 100) return { id: "qualifiedSemi", title: "QUALIFIED SEMI-FINAL", subtitle: "FINAL FOUR", symbol: "SF", tone: "green" };
    if (matchNo >= 89 && matchNo <= 96) return { id: "qualifiedQuarter", title: "QUALIFIED QF", subtitle: "LAST EIGHT", symbol: "QF", tone: "green" };
    if (matchNo >= 73 && matchNo <= 88) return { id: "qualifiedR16", title: "QUALIFIED R16", subtitle: "KNOCKOUT WIN", symbol: "16", tone: "green" };
    return { id: "victory", title: "VICTORY", subtitle: "KNOCKOUT WIN", symbol: "✓", tone: "green" };
  }
  if (status === RESULT_STATUS.GROUP_WIN) {
    return { id: "victory", title: "VICTORY", subtitle: "GROUP STAGE WIN", symbol: "✓", tone: "green" };
  }
  if (status === RESULT_STATUS.GROUP_DRAW) {
    return { id: "stalemate", title: "STALEMATE", subtitle: "GROUP STAGE DRAW", symbol: "=", tone: "yellow" };
  }
  if (status === RESULT_STATUS.GROUP_LOSS) {
    return { id: "defeat", title: "DEFEAT", subtitle: "GROUP STAGE LOSS", symbol: "↓", tone: "red" };
  }

  return { id: "result", title: String(stageLabel || "FULL TIME").toUpperCase(), subtitle: "RESULT LOCKED", symbol: "MC", tone: "yellow" };
}

function toneStyles(tone = "yellow") {
  if (tone === "gold") return { accent: "#F7D117", fill: "rgba(247,209,23,0.94)", text: "#072D1D", glow: "rgba(247,209,23,0.34)" };
  if (tone === "silver") return { accent: "#D8D8D8", fill: "rgba(216,216,216,0.94)", text: "#072D1D", glow: "rgba(245,241,232,0.28)" };
  if (tone === "bronze") return { accent: "#D9822B", fill: "rgba(217,130,43,0.94)", text: "#072D1D", glow: "rgba(217,130,43,0.28)" };
  if (tone === "green") return { accent: "#22C55E", fill: "rgba(34,197,94,0.94)", text: "#051A11", glow: "rgba(34,197,94,0.30)" };
  if (tone === "red") return { accent: "#EF4444", fill: "rgba(239,68,68,0.94)", text: "#F5F1E8", glow: "rgba(239,68,68,0.28)" };
  return { accent: "#F7D117", fill: "rgba(247,209,23,0.94)", text: "#072D1D", glow: "rgba(247,209,23,0.30)" };
}

export function ResultBadgeIcon({ badge, size = "large", className = "" }) {
  if (!badge) return null;
  const tone = toneStyles(badge.tone);
  const compact = size === "small";
  const boxClass = compact ? "h-16 w-16 rounded-[1.05rem]" : "h-[clamp(86px,24vw,118px)] w-[clamp(86px,24vw,118px)] rounded-[1.4rem]";
  if (badge.image) {
    return (
      <div className={`relative grid ${boxClass} place-items-center ${className}`} aria-hidden="true">
        <div className="absolute inset-[-14%] rounded-full blur-2xl" style={{ background: tone.glow }} />
        <img src={badge.image} alt="" className="relative z-[1] h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.28)]" draggable={false} />
      </div>
    );
  }

  return (
    <div className={`relative grid ${boxClass} place-items-center ${className}`} aria-hidden="true">
      <img
        src={ASSETS.branding.mondayLogo}
        alt=""
        className="relative z-[1] h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.44)]"
        draggable={false}
      />
    </div>
  );
}

export function ResultBadgePanel({ badge, className = "" }) {
  if (!badge) return null;
  const tone = toneStyles(badge.tone);
  return (
    <div className={`mx-auto mb-2 flex w-[92%] items-center justify-center gap-3 rounded-[1.15rem] border bg-[#051A11]/72 px-3 py-2.5 text-left shadow-[0_10px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(245,241,232,0.06)] ${className}`} style={{ borderColor: `${tone.accent}88` }}>
      <ResultBadgeIcon badge={badge} size="small" />
      <div className="min-w-0 flex-1 text-center">
        <div className="home-copy-bold truncate text-[clamp(16px,4.8vw,22px)] uppercase leading-none tracking-[0.08em]" style={{ color: tone.accent }}>{badge.title}</div>
        <div className="mt-1 home-copy-bold text-[8px] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]/72">{badge.subtitle}</div>
      </div>
    </div>
  );
}

export function ResultBadgeShareOverlay({ badge }) {
  if (!badge) return null;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[27.75%] z-[38] flex w-[32%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
      data-share-result-badge="true"
      aria-hidden="true"
    >
      <ResultBadgeIcon badge={badge} className="h-full w-full" />
    </div>
  );
}

export default ResultBadgePanel;
