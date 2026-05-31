import { Flag } from "../shared.jsx";
import { GAME, visiblePenaltyMarkers } from "../../logic/penaltyEngine.js";
import { normaliseThirdPlaceCopy } from "../../logic/matchVisuals.js";

function TeamFlag({ team, className = "h-4 w-6" }) {
  if (team.flag) return <img src={team.flag} alt={`${team.name} flag`} className={`${className} rounded-sm object-cover`} draggable={false} />;
  return <Flag team={team.name} className={className} />;
}

function PenaltyMarkers({ attempts, totalSlots = GAME.regulationPens }) {
  const visible = visiblePenaltyMarkers(attempts);
  return (
    <div className="inline-flex min-w-0 justify-center gap-[clamp(2px,0.72vw,3px)]">
      {Array.from({ length: totalSlots }).map((_, idx) => {
        const value = visible[idx];
        const markerValue = typeof value === "string" ? value : value?.result;
        const color = markerValue === "G" ? "bg-green-500 pen-marker-goal" : markerValue === "S" ? "bg-red-500 pen-marker-save" : "bg-[#F7D117] pen-marker-empty";
        return <span key={idx} className={`h-[clamp(4px,1.15vw,6px)] w-[clamp(4px,1.15vw,6px)] shrink-0 rounded-full ${color}`} />;
      })}
    </div>
  );
}

export function Scoreboard({ userTeam, opponentTeam, score, attempts, ticker, tickerStyle, stageLabel, totalMarkerSlots = GAME.regulationPens, hideStageLabel = false }) {
  return (
    <section data-share-scoreboard="true" className="relative mt-0 h-[calc((100dvh-54px)*0.165)] shrink-0 overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[inset_0_1px_0_rgba(245,241,232,0.16),inset_0_-1px_0_rgba(245,241,232,0.18),0_2px_8px_rgba(0,0,0,0.22)]">
      <div data-share-scoreboard-main="true" className="relative h-[calc(100%-26%)] overflow-hidden bg-[#050505]">
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
          <div className="grid h-[86%] w-full grid-cols-[42px_minmax(0,1fr)_clamp(34px,10vw,48px)_clamp(34px,9vw,46px)_clamp(34px,10vw,48px)_minmax(0,1fr)_42px] grid-rows-[25%_50%_25%] items-center">
            <div data-normalise-stage-label="true" className="col-start-2 col-end-7 row-start-1 flex items-center justify-center">
              <div className="led-text-glow font-led flex min-h-[clamp(13px,1.8vh,18px)] items-center justify-center whitespace-nowrap text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] text-[#F7D117]" style={{ fontFamily: "IntoDotMatrix, monospace", fontWeight: 900 }}>
                {normaliseThirdPlaceCopy(stageLabel || "GROUP STAGE")}
              </div>
            </div>

            <div className="col-start-1 row-start-2 flex h-full items-center justify-center">
              <TeamFlag team={userTeam} className="h-[clamp(12px,3.6vw,16px)] w-[clamp(18px,5.3vw,24px)] ring-1 ring-[#F7D117]/88 shadow-[0_0_6px_rgba(247,209,23,0.30)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" />
            </div>
            <div className="col-start-2 row-start-2 flex h-full min-w-0 items-center justify-center px-[clamp(8px,3vw,18px)]">
              <div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-normal leading-none tracking-tight text-[#F7D117]">{userTeam.code}</div>
            </div>
            <div className="led-text-glow font-led col-start-3 row-start-2 flex h-full items-center justify-center pl-[clamp(5px,1.6vw,12px)] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums">{score.user}</div>
            <div className="led-text-glow font-led col-start-4 row-start-2 flex h-full items-center justify-center px-[clamp(8px,2.4vw,16px)] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117]">-</div>
            <div className="led-text-glow font-led col-start-5 row-start-2 flex h-full items-center justify-center pr-[clamp(5px,1.6vw,12px)] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums">{score.opponent}</div>
            <div className="col-start-6 row-start-2 flex h-full min-w-0 items-center justify-center px-[clamp(8px,3vw,18px)]">
              <div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-normal leading-none tracking-tight text-[#F7D117]">{opponentTeam.code}</div>
            </div>
            <div className="col-start-7 row-start-2 flex h-full items-center justify-center">
              <TeamFlag team={opponentTeam} className="h-[clamp(12px,3.6vw,16px)] w-[clamp(18px,5.3vw,24px)] ring-1 ring-[#F7D117]/88 shadow-[0_0_6px_rgba(247,209,23,0.30)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" />
            </div>

            <div className="col-start-2 row-start-3 flex h-full items-center justify-center">
              <div className="inline-flex max-w-full items-center justify-center rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(5px,1.5vw,9px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
                <span className="flex min-h-[clamp(12px,1.65vh,17px)] items-center justify-center leading-none"><PenaltyMarkers attempts={attempts.user} totalSlots={totalMarkerSlots} /></span>
              </div>
            </div>
            <div data-share-username-slot="true" className="col-start-3 col-end-6 row-start-3 flex h-full items-center justify-center px-[clamp(5px,1.5vw,10px)]" aria-hidden="true">
              <div className="invisible led-text-glow font-led flex min-h-[clamp(13px,1.8vh,18px)] items-center justify-center whitespace-nowrap text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] text-[#F7D117]">
                USERNAME0000
              </div>
            </div>
            <div className="col-start-6 row-start-3 flex h-full items-center justify-center">
              <div className="inline-flex max-w-full items-center justify-center rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(5px,1.5vw,9px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
                <span className="flex min-h-[clamp(12px,1.65vh,17px)] items-center justify-center leading-none"><PenaltyMarkers attempts={attempts.opponent} totalSlots={totalMarkerSlots} /></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div data-share-flash="true" className="grid h-[26%] w-full place-items-center overflow-hidden px-[3%] text-center home-copy-bold text-[clamp(13px,2.3vh,28px)] font-black uppercase leading-none tracking-[0.085em] shadow-[0_0_8px_rgba(245,241,232,0.05),inset_0_2px_8px_rgba(255,255,255,0.08)]" style={tickerStyle}>
        {ticker}
      </div>
    </section>
  );
}

