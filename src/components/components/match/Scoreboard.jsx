import { Flag } from "../shared.jsx";
import { GAME, visiblePenaltyMarkers } from "../../logic/penaltyEngine.js";
import { normaliseThirdPlaceCopy } from "../../logic/matchVisuals.js";
import { MC_SELECTION_LAYOUT } from "../../styles/theme.js";

function TeamFlag({ team, className = "h-[17px] w-[25px]" }) {
  if (team.flag) {
    return (
      <img
        src={team.flag}
        alt={`${team.name} flag`}
        className={`${className} inline-block shrink-0 rounded-[4px] border border-[#F7D117]/82 bg-[#F5F1E8] object-cover align-middle outline outline-[0.6px] outline-[#F7D117]/75 outline-offset-0`}
        style={{
          boxShadow: "0 0 2px rgba(247,209,23,0.12), inset 0 0 0 0.7px rgba(3,27,18,0.24)",
          filter: "none",
        }}
        draggable={false}
      />
    );
  }
  return <Flag team={team.name} className={className} />;
}

function PenaltyMarkers({ attempts, totalSlots = GAME.regulationPens }) {
  const allMarkers = visiblePenaltyMarkers(attempts);
  const displaySlots = Math.max(totalSlots, allMarkers.length, GAME.regulationPens);
  const dotSize = "clamp(4px,1.15vw,6px)";
  const gapSize = "clamp(2px,0.72vw,3px)";

  return (
    <div className="inline-flex w-max max-w-none justify-center overflow-visible" style={{ gap: gapSize }}>
      {Array.from({ length: displaySlots }).map((_, idx) => {
        const value = allMarkers[idx];
        const markerValue = typeof value === "string" ? value : value?.result;
        const color = markerValue === "G" ? "bg-green-500" : markerValue === "S" ? "bg-red-500" : "bg-[#F7D117]";
        return <span key={idx} data-share-marker-dot="true" className={`shrink-0 rounded-full ${color}`} style={{ width: dotSize, height: dotSize, boxShadow: "0 0 2px rgba(247,209,23,0.10)", filter: "none" }} />;
      })}
    </div>
  );
}

function flashTickerFontSize() {
  // Constant export/preview size: sized for the longest commentary line, never changes per copy.
  return "clamp(13px,1.75dvh,21px)";
}


export function Scoreboard({ userTeam, opponentTeam, score, attempts, ticker, tickerStyle, tickerTeam = null, stageLabel, totalMarkerSlots = GAME.regulationPens, hideStageLabel = false, sharePreview = false, username = "", usernameEnabled = false, usernameTone = "yellow" }) {
  const scoreboardHeight = `calc((100dvh - ${MC_SELECTION_LAYOUT.topBarHeight}px) * ${MC_SELECTION_LAYOUT.scoreboardRatio})`;
  const tickerPercent = MC_SELECTION_LAYOUT.tickerRatio * 100;
  const heightClass = sharePreview ? "h-[22%]" : "";
  const heightStyle = sharePreview ? undefined : { height: scoreboardHeight };
  const tickerCopy = String(ticker || "").replace(/\s+/g, " ").trim();
  const tickerFontSize = flashTickerFontSize(tickerCopy);
  const cleanUsername = String(username || "").replace(/\s+/g, " ").trim().toUpperCase() || "GUEST";
  const crispLedStyle = { textShadow: "0 0 0.25px rgba(247,209,23,0.20)", WebkitFontSmoothing: "antialiased", filter: "none" };
  const usernameToneColour = "#F7D117";
  return (
    <section data-share-scoreboard="true" className={`relative mt-0 ${heightClass} shrink-0 overflow-visible bg-[#050505]`} style={heightStyle}>
      <div data-share-scoreboard-main="true" className="relative overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[0_2px_8px_rgba(0,0,0,0.20)]" style={{ height: `${100 - tickerPercent}%` }}>
        <div
          className="pointer-events-none absolute left-[2px] right-[2px] top-[2px] bottom-[2px] opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(247,209,23,0.24) 0.72px, transparent 1.44px)",
            backgroundSize: "6px calc(100% / 12)",
            backgroundPosition: "center top",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />

        <div className="relative z-[1] flex h-full items-center px-[clamp(8px,3.5%,18px)] py-0">
          <div className="grid h-[88%] w-full grid-cols-[42px_minmax(0,1fr)_clamp(34px,10vw,48px)_clamp(34px,9vw,46px)_clamp(34px,10vw,48px)_minmax(0,1fr)_42px] grid-rows-[30%_45%_25%] items-center">
            {!hideStageLabel && (
              <div data-normalise-stage-label="true" className="col-start-2 col-end-7 row-start-1 flex items-center justify-center">
                <div className="inline-flex min-h-[clamp(17px,2.15vh,22px)] max-w-full items-center justify-center rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(7px,2vw,12px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
                  <div className="led-text-glow font-led flex min-h-full items-center justify-center whitespace-nowrap text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] text-[#F7D117]" style={{ fontFamily: "IntoDotMatrix, monospace", fontWeight: 900 }}>
                    {normaliseThirdPlaceCopy(stageLabel || "GROUP STAGE")}
                  </div>
                </div>
              </div>
            )}

            <div className="col-start-1 row-start-2 flex h-full items-center justify-center">
              <TeamFlag team={userTeam} className="h-[17px] w-[25px]" />
            </div>
            <div className="col-start-2 row-start-2 row-end-4 grid h-full min-w-0 overflow-visible" style={{ gridTemplateRows: "45fr 25fr" }}>
              <div className="row-start-1 flex h-full min-w-0 items-center justify-center px-[clamp(8px,3vw,18px)]">
                <div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-normal leading-none tracking-tight text-[#F7D117]" style={crispLedStyle}>{userTeam.code}</div>
              </div>
              <div className="relative z-[1] row-start-2 flex h-full min-w-0 items-center justify-center overflow-visible">
                <span className="flex min-h-[clamp(12px,1.65vh,17px)] min-w-0 items-center justify-center overflow-visible leading-none"><PenaltyMarkers attempts={attempts.user} totalSlots={totalMarkerSlots} /></span>
              </div>
            </div>
            <div className="led-text-glow font-led col-start-3 row-start-2 flex h-full items-center justify-center pl-[clamp(5px,1.6vw,12px)] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums" style={crispLedStyle}>{score.user}</div>
            <div className="led-text-glow font-led col-start-4 row-start-2 flex h-full items-center justify-center px-[clamp(8px,2.4vw,16px)] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117]" style={crispLedStyle}>-</div>
            <div className="led-text-glow font-led col-start-5 row-start-2 flex h-full items-center justify-center pr-[clamp(5px,1.6vw,12px)] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums" style={crispLedStyle}>{score.opponent}</div>
            <div className="col-start-6 row-start-2 row-end-4 grid h-full min-w-0 overflow-visible" style={{ gridTemplateRows: "45fr 25fr" }}>
              <div className="row-start-1 flex h-full min-w-0 items-center justify-center px-[clamp(8px,3vw,18px)]">
                <div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-normal leading-none tracking-tight text-[#F7D117]" style={crispLedStyle}>{opponentTeam.code}</div>
              </div>
              <div className="relative z-[1] row-start-2 flex h-full min-w-0 items-center justify-center overflow-visible">
                <span className="flex min-h-[clamp(12px,1.65vh,17px)] min-w-0 items-center justify-center overflow-visible leading-none"><PenaltyMarkers attempts={attempts.opponent} totalSlots={totalMarkerSlots} /></span>
              </div>
            </div>
            <div className="col-start-7 row-start-2 flex h-full items-center justify-center">
              <TeamFlag team={opponentTeam} className="h-[17px] w-[25px]" />
            </div>

            <div data-share-username-slot="true" className="relative z-[3] col-start-3 col-end-6 row-start-3 flex h-full items-center justify-center px-[clamp(5px,1.5vw,10px)]">
              <div className={`${usernameEnabled ? "visible" : "invisible"} led-text-glow font-led inline-flex min-h-[clamp(17px,2.15vh,22px)] max-w-full items-center justify-center truncate whitespace-nowrap rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(7px,2vw,12px)] py-0 text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]`} style={{ color: usernameToneColour }}>
                <span className="flex h-full items-center justify-center leading-none">{cleanUsername || "GUEST"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        data-share-flash="true"
        className="relative flex w-full items-center justify-center overflow-visible px-[3%] text-center uppercase tracking-[0.085em]"
        style={{
          height: `${tickerPercent}%`,
          marginTop: 0,
          boxSizing: "border-box",
          minHeight: 0,
          fontFamily: '"SportsDINBold", "SportsDINRegular", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 900,
          lineHeight: 1,
          ...tickerStyle,
        }}
      >
        <span
          className="relative z-[1] block max-w-[94%] overflow-hidden truncate whitespace-nowrap text-center leading-none [text-wrap:nowrap]"
          style={{ fontSize: tickerFontSize, lineHeight: 1, textOverflow: "ellipsis", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}
        >
          {tickerCopy}
        </span>
      </div>
    </section>
  );
}
