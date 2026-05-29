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
    <div className="flex w-full min-w-0 justify-center gap-[clamp(2px,0.72vw,3px)]">
      {Array.from({ length: totalSlots }).map((_, idx) => {
        const value = visible[idx];
        const markerValue = typeof value === "string" ? value : value?.result;
        const color = markerValue === "G" ? "bg-green-500 pen-marker-goal" : markerValue === "S" ? "bg-red-500 pen-marker-save" : "bg-[#F7D117] pen-marker-empty";
        return <span key={idx} className={`h-[clamp(4px,1.15vw,6px)] w-[clamp(4px,1.15vw,6px)] shrink-0 rounded-full ${color}`} />;
      })}
    </div>
  );
}

export function Scoreboard({ userTeam, opponentTeam, score, attempts, ticker, tickerStyle, stageLabel, totalMarkerSlots = GAME.regulationPens }) {
  return (
    <section data-share-scoreboard="true" className="relative h-[clamp(94px,16.5dvh,132px)] shrink-0 overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[inset_0_1px_0_rgba(245,241,232,0.16),inset_0_-1px_0_rgba(245,241,232,0.18),0_2px_8px_rgba(0,0,0,0.22)]">
      <div
        className="absolute inset-x-0 top-[4px] bottom-[4px] opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(247,209,23,0.24) 0.78px, transparent 1.55px)",
          backgroundSize: "7px 7px",
          backgroundPosition: "3.5px 3.5px",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
      <div data-share-score-divider="true" className="absolute inset-x-0 bottom-[26%] z-[2] h-px bg-[#F5F1E8]/20 shadow-[0_0_6px_rgba(245,241,232,0.10)]" />
      <div className="relative z-[1] h-full">
        <div data-normalise-stage-label="true" className="led-text-glow font-led grid h-[22%] place-items-center py-[2%] text-center text-[clamp(9px,1.35vh,16px)] font-black uppercase tracking-[0.14em] text-[#F7D117]">
          {normaliseThirdPlaceCopy(stageLabel || "GROUP STAGE")}
        </div>
        <div className="h-[52%] px-[clamp(8px,3.5%,18px)] pt-[1%]">
          <div className="grid h-full grid-cols-[13%_minmax(34px,1fr)_clamp(26px,8vw,38px)_clamp(16px,5vw,26px)_clamp(26px,8vw,38px)_minmax(34px,1fr)_13%] grid-rows-[58%_42%] items-center">
            <div className="col-start-1 row-start-1 flex items-center justify-center"><TeamFlag team={userTeam} className="h-[clamp(12px,3.6vw,16px)] w-[clamp(18px,5.3vw,24px)] ring-1 ring-[#F7D117]/38 shadow-[0_0_4px_rgba(247,209,23,0.16)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" /></div>
            <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-center px-[2%]"><div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-black leading-none tracking-tight text-[#F7D117]">{userTeam.code}</div></div>
            <div className="led-text-glow font-led col-start-3 row-start-1 flex items-center justify-center text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums">{score.user}</div>
            <div className="led-text-glow font-led col-start-4 row-start-1 flex items-center justify-center px-[4px] text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117]">-</div>
            <div className="led-text-glow font-led col-start-5 row-start-1 flex items-center justify-center text-[clamp(16px,3dvh,32px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums">{score.opponent}</div>
            <div className="col-start-6 row-start-1 flex min-w-0 items-center justify-center px-[2%]"><div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-black leading-none tracking-tight text-[#F7D117]">{opponentTeam.code}</div></div>
            <div className="col-start-7 row-start-1 flex items-center justify-center"><TeamFlag team={opponentTeam} className="h-[clamp(12px,3.6vw,16px)] w-[clamp(18px,5.3vw,24px)] ring-1 ring-[#F7D117]/38 shadow-[0_0_4px_rgba(247,209,23,0.16)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" /></div>
            <div className="col-start-2 row-start-2 flex justify-center pt-[2%]"><div className="flex min-w-0 w-full max-w-[4.4em] justify-center"><PenaltyMarkers attempts={attempts.user} totalSlots={totalMarkerSlots} /></div></div>
            <div className="col-start-6 row-start-2 flex justify-center pt-[2%]"><div className="flex min-w-0 w-full max-w-[4.4em] justify-center"><PenaltyMarkers attempts={attempts.opponent} totalSlots={totalMarkerSlots} /></div></div>
          </div>
        </div>
        <div data-share-flash="true" className="grid h-[26%] w-full place-items-center overflow-hidden border-y border-[#F5F1E8]/24 px-[3%] text-center home-copy-bold text-[clamp(12px,2.15dvh,25px)] font-black tracking-[0.075em] shadow-[0_0_8px_rgba(245,241,232,0.05),inset_0_2px_8px_rgba(255,255,255,0.08)]" style={tickerStyle}>
          {ticker}
        </div>
      </div>
    </section>
  );
}
