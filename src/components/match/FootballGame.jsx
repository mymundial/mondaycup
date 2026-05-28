import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "../shared.jsx";
import { ASSETS } from "../../data/assets.js";
import {
  DEFAULT_ASSETS,
  LED_YELLOW,
  GAME,
  DIRECTIONS,
  PHASE,
  COMMENTARY,
  clamp,
  getDirection,
  randomDirection,
  normaliseTeam,
  pointForDirection,
  keeperTransform,
  ballTransform,
  shotTravelMs,
  keeperTravelMs,
  classifyPower,
  resolvePenalty,
  buildAiPenaltyAttempt,
  keeperReadDirection,
  playSound,
  visiblePenaltyMarkers,
  decideMatchState,
  stageLabelForFixture,
  buildResult,
} from "../../logic/penaltyEngine.js";
import { PODIUM_BADGE_MODE } from "../../logic/resultStatus.js";

const MONDAY_CUP_AD_SRC = ASSETS.branding.mondayCupAd;
const CHAMPIONS_BADGE_SRC = ASSETS.badges.champion;
const RUNNER_UP_BADGE_SRC = ASSETS.badges.runnerUp;
const THIRD_PLACE_BADGE_SRC = ASSETS.badges.third;
const COSMETICS_KEY = "mondayCup.clubhouseCosmetics";
const GOLDEN_BALL_SRC = "/assets/game/golden-ball.png";
const GOLDEN_GLOVE_SRC = "/assets/game/golden-glove.png";
const PHASE_ACCURACY = "accuracy";
const POWER_SWEEP_MS = 1050;
const ACCURACY_SWEEP_MS = 900;

function readActiveCosmetics() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(COSMETICS_KEY) || "{}");
  } catch {
    return {};
  }
}

function TeamFlag({ team, className = "h-4 w-6" }) {
  if (team.flag) return <img src={team.flag} alt={`${team.name} flag`} className={`${className} rounded-sm object-cover`} draggable={false} />;
  return <Flag team={team.name} className={className} />;
}

function normaliseThirdPlaceCopy(value) {
  return String(value || "").replace(/3rd\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF").replace(/third\s*place\s*playoff/gi, "THIRD PLACE PLAY-OFF").replace(/third\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF");
}

function getPodiumBadgeVisuals(mode) {
  if (mode === PODIUM_BADGE_MODE.RUNNER_UP) {
    return {
      src: RUNNER_UP_BADGE_SRC,
      alt: "Monday Cup Runner-Up",
      glowOuter: "rgba(235,238,243,0.26)",
      glowInner: "rgba(255,255,255,0.22)",
      shadow: "drop-shadow(0 0 18px rgba(235,238,243,0.42))",
    };
  }
  if (mode === PODIUM_BADGE_MODE.THIRD) {
    return {
      src: THIRD_PLACE_BADGE_SRC,
      alt: "Monday Cup Third Place",
      glowOuter: "rgba(205,127,50,0.26)",
      glowInner: "rgba(244,176,104,0.22)",
      shadow: "drop-shadow(0 0 18px rgba(205,127,50,0.42))",
    };
  }
  if (mode === PODIUM_BADGE_MODE.CHAMPION) {
    return {
      src: CHAMPIONS_BADGE_SRC,
      alt: "Monday Cup Champions",
      glowOuter: "rgba(247,209,23,0.26)",
      glowInner: "rgba(255,213,74,0.26)",
      shadow: "drop-shadow(0 0 18px rgba(247,209,23,0.46))",
    };
  }
  return null;
}

function PenaltyMarkers({ attempts, totalSlots = GAME.regulationPens }) {
  const visible = visiblePenaltyMarkers(attempts);
  return (
    <div className="flex w-full justify-center gap-[3px]">
      {Array.from({ length: totalSlots }).map((_, idx) => {
        const value = visible[idx];
        const markerValue = typeof value === "string" ? value : value?.result;
        const color = markerValue === "G" ? "bg-green-500 pen-marker-goal" : markerValue === "S" ? "bg-red-500 pen-marker-save" : "bg-[#F7D117] pen-marker-empty";
        return <span key={idx} className={`h-[6px] w-[6px] rounded-full ${color}`} />;
      })}
    </div>
  );
}

function Scoreboard({ userTeam, opponentTeam, score, attempts, ticker, tickerStyle, stageLabel, totalMarkerSlots = GAME.regulationPens }) {
  return (
    <section data-share-scoreboard="true" className="relative h-[16.5%] shrink-0 overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[inset_0_1px_0_rgba(245,241,232,0.16),inset_0_-1px_0_rgba(245,241,232,0.18),0_2px_8px_rgba(0,0,0,0.22)]">
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
        <div className="h-[52%] px-[3.5%] pt-[1%]">
          <div className="grid h-full grid-cols-[17%_minmax(48px,1fr)_38px_26px_38px_minmax(48px,1fr)_17%] grid-rows-[58%_42%] items-center">
            <div className="col-start-1 row-start-1 flex items-center justify-center"><TeamFlag team={userTeam} className="h-4 w-6 ring-1 ring-[#F7D117]/38 shadow-[0_0_4px_rgba(247,209,23,0.16)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" /></div>
            <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-center px-[2%]"><div className="led-text-glow font-led w-full text-center text-[clamp(17px,3.1vh,34px)] font-black leading-none tracking-tight text-[#F7D117]">{userTeam.code}</div></div>
            <div className="led-text-glow font-led col-start-3 row-start-1 flex items-center justify-center text-[clamp(17px,3.05vh,34px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums">{score.user}</div>
            <div className="led-text-glow font-led col-start-4 row-start-1 flex items-center justify-center px-[4px] text-[clamp(17px,3.05vh,34px)] font-black leading-none tracking-normal text-[#F7D117]">-</div>
            <div className="led-text-glow font-led col-start-5 row-start-1 flex items-center justify-center text-[clamp(17px,3.05vh,34px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums">{score.opponent}</div>
            <div className="col-start-6 row-start-1 flex min-w-0 items-center justify-center px-[2%]"><div className="led-text-glow font-led w-full text-center text-[clamp(17px,3.1vh,34px)] font-black leading-none tracking-tight text-[#F7D117]">{opponentTeam.code}</div></div>
            <div className="col-start-7 row-start-1 flex items-center justify-center"><TeamFlag team={opponentTeam} className="h-4 w-6 ring-1 ring-[#F7D117]/38 shadow-[0_0_4px_rgba(247,209,23,0.16)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" /></div>
            <div className="col-start-2 row-start-2 flex justify-center pt-[2%]"><div className="flex min-w-[4.4em] justify-center"><PenaltyMarkers attempts={attempts.user} totalSlots={totalMarkerSlots} /></div></div>
            <div className="col-start-6 row-start-2 flex justify-center pt-[2%]"><div className="flex min-w-[4.4em] justify-center"><PenaltyMarkers attempts={attempts.opponent} totalSlots={totalMarkerSlots} /></div></div>
          </div>
        </div>
        <div data-share-flash="true" className="grid h-[26%] w-full place-items-center overflow-hidden border-y border-[#F5F1E8]/24 px-[3%] text-center home-copy-bold text-[clamp(13px,2.3vh,28px)] font-black tracking-[0.075em] shadow-[0_0_8px_rgba(245,241,232,0.05),inset_0_2px_8px_rgba(255,255,255,0.08)]" style={tickerStyle}>
          {ticker}
        </div>
      </div>
    </section>
  );
}

function PowerChargeMeter({ value, ideal = GAME.powerIdeal, charging = false, fillRef = null }) {
  const left = `${ideal[0]}%`;
  const width = `${ideal[1] - ideal[0]}%`;

  return (
    <div className="relative h-10 rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/22 bg-[#0b2d1d] p-1 shadow-[0_8px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/50">
      <div className="relative h-full overflow-hidden rounded-[clamp(14px,2.2vh,28px)] bg-[#061A11]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.18))]" />
        <div
          className="absolute inset-y-0 bg-[#0B5F35]/78 shadow-[0_0_10px_rgba(11,95,53,0.32),inset_0_0_8px_rgba(18,214,97,0.11)]"
          style={{ left, width }}
        />
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.45)]"
          style={{ width: `${value}%`, borderTopLeftRadius: 999, borderBottomLeftRadius: 999, borderTopRightRadius: 0, borderBottomRightRadius: 0, willChange: "width" }}
        />
        <div className="absolute inset-y-[-3px] left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-[#F5F1E8] shadow-[0_0_7px_rgba(245,241,232,0.75)]" />
        <div className={`pointer-events-none absolute inset-0 ${charging ? "animate-pulse" : ""} bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(0,0,0,0.13))]`} />
      </div>
    </div>
  );
}

function AccuracyMeter({ value, ideal = [43, 57], running = false }) {
  const left = `${ideal[0]}%`;
  const width = `${ideal[1] - ideal[0]}%`;

  return (
    <div className="relative h-10 rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/22 bg-[#0b2d1d] p-1 shadow-[0_8px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/50">
      <div className="relative h-full overflow-hidden rounded-[clamp(14px,2.2vh,28px)] bg-[#061A11]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.18))]" />
        <div
          className="absolute inset-y-0 bg-[#0B5F35]/82 shadow-[0_0_10px_rgba(11,95,53,0.32),inset_0_0_8px_rgba(18,214,97,0.11)]"
          style={{ left, width }}
        />
        <div className="absolute inset-y-[-3px] left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-[#F5F1E8] shadow-[0_0_7px_rgba(245,241,232,0.75)]" />
        <div
          className="absolute inset-y-[-2px] w-[4px] -translate-x-1/2 rounded-full bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.65)]"
          style={{ left: `${value}%`, willChange: "left" }}
        />
        <div className={`pointer-events-none absolute inset-0 ${running ? "animate-pulse" : ""} bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(0,0,0,0.13))]`} />
      </div>
    </div>
  );
}

function CrowdPerson({ x, y, scale = 1, shirt = "#0d6c3d", skin = "#c98f65", pose = "down", opacity = 1 }) {
  const armLeft = pose === "up" ? "M5 13 L1 6" : "M5 13 L2 20";
  const armRight = pose === "up" ? "M13 13 L17 6" : "M13 13 L16 20";
  return (
    <svg className="absolute overflow-visible" style={{ left: `${x}%`, top: `${y}%`, width: `${18 * scale}px`, height: `${30 * scale}px`, opacity, transform: "translate(-50%, -50%)" }} viewBox="0 0 18 30" aria-hidden="true">
      <path d={armLeft} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <path d={armRight} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="6" r="4" fill={skin} />
      <rect x="4" y="11" width="10" height="12" rx="3" fill={shirt} />
      <rect x="5" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
      <rect x="10" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
    </svg>
  );
}

function CrowdBackdrop({ crowdColours = [] }) {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  const boardTop = goalLine - boardHeight;
  const shirts = crowdColours.length ? crowdColours : [
    "#2DA94F", "#F7D117", "#FF1E3C", "#E1251B", "#2F3ED6", "#8A1538", "#FF8A00", "#1E7FF0",
    "#157A52", "#93BFEA", "#FFFFFF", "#2437C6", "#F20D1B", "#00A86B", "#7CB5E8", "#F7C600",
    "#E10600", "#1A22C9", "#9B003F", "#D50000", "#FF3B30", "#3131E8"
  ];
  const skins = ["#c98f65", "#8f5f3f", "#e0b184", "#6f4632"];
  const makeRow = ({ count, step, y, scale, opacity, stagger = 0, wave = 0, shirtOffset = 0, skinOffset = 0 }) => {
    const centredStartX = 50 - (((count - 1) * step) + stagger) / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: centredStartX + i * step + (i % 2 ? stagger : 0),
      y: y + (i % 3) * wave,
      scale,
      shirt: shirts[((i * 7) + shirtOffset) % shirts.length],
      skin: skins[(i + skinOffset) % skins.length],
      pose: i % 4 === 0 || i % 7 === 0 ? "up" : "down",
      opacity,
    }));
  };

  const rowConfigs = Array.from({ length: 16 }, (_, index) => {
    const t = index / 15;
    const y = 2.5 + 94 * Math.pow(t, 1.24);
    return {
      count: Math.round(62 - t * 34),
      step: 1.68 + t * 2.45,
      y,
      scale: 0.26 + t * 0.78,
      opacity: 0.16 + t * 0.84,
      stagger: 0.18 + t * 1.04,
      wave: 0.12 + t * 0.80,
      shirtOffset: index,
      skinOffset: index % skins.length,
    };
  });
  const crowdRows = rowConfigs.flatMap((config) => makeRow(config));
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden bg-[#123822]" style={{ height: `${boardTop}%` }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(5,26,17,0.52), rgba(5,26,17,0.28) 30%, rgba(5,26,17,0.18) 58%, rgba(5,26,17,0.10) 100%), radial-gradient(circle at 18% 10%, rgba(245,241,232,0.05), transparent 18%), radial-gradient(circle at 82% 14%, rgba(255,214,0,0.04), transparent 16%)",
        }}
      />
      <div className="absolute inset-x-0 top-[6%] h-[6%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[16%] h-[7%] bg-[#0b2d1d]/8" />
      <div className="absolute inset-x-0 top-[28%] h-[8%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[41%] h-[9%] bg-[#0b2d1d]/8" />
      <div className="absolute inset-x-0 top-[55%] h-[10%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[70%] h-[11%] bg-[#0b2d1d]/8" />
      <div className="absolute inset-x-0 top-[85%] h-[10%] bg-[#0b2d1d]/10" />
      {crowdRows.map((person, index) => <CrowdPerson key={index} {...person} />)}
    </div>
  );
}

function LedAdvertisingHoard() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-t border-[#05150E] bg-[#072D1D] shadow-[0_-8px_24px_rgba(0,0,0,0.42)]" style={{ top: `${goalLine - boardHeight}%`, height: `${boardHeight}%` }}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
      <div className="relative mx-auto flex h-full max-w-[76%] items-center justify-center">
        <img src={MONDAY_CUP_AD_SRC} alt="Monday Cup" className="relative z-[1] h-[90%] w-full object-contain" draggable={false} />
      </div>
    </div>
  );
}

function GoalFrame({ showAim, aimDirection }) {
  const goal = GAME.goal;
  return (
    <div className="absolute z-[3] overflow-hidden border-[8px] border-b-0 border-[#f5f1e8] bg-[#0d6c3d]/30" style={{ left: `${goal.left}%`, top: `${goal.top}%`, width: `${goal.width}%`, height: `${goal.height}%` }}>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent 1.8%, rgba(245,241,232,0.18) 2.0%, transparent 2.2%), repeating-linear-gradient(180deg, transparent 0%, transparent 2.6%, rgba(245,241,232,0.16) 2.8%, transparent 3.1%), linear-gradient(135deg, transparent 0%, transparent 49%, rgba(245,241,232,0.08) 49.4%, transparent 50%)", backgroundSize: "100% 100%, 100% 100%, 8px 8px" }} />
      {showAim && (
        <div className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-[3px] border-[#F7D117] bg-[#F7D117]/14 shadow-[0_0_10px_rgba(247,209,23,0.52),0_0_22px_rgba(247,209,23,0.22)]" style={{ left: `${((aimDirection.col + 0.5) / 3) * 100}%`, top: `${((aimDirection.row + 0.5) / 3) * 100}%`, animationDuration: "1.1s" }}>
          <div className="absolute inset-[-18%] animate-ping rounded-full border-2 border-[#F7D117]/70" style={{ animationDuration: "1.35s" }} />
          <div className="absolute inset-[30%] rounded-full bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.8)]" />
        </div>
      )}
    </div>
  );
}

function Pitch({ ballPoint, keeperPoint, shot, shotActive, activeTeam, defenderTeam, showAim, aimDirection, assets, showChampionsBadge = false, podiumBadgeMode = null, hideMatchActors = false }) {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const activeBadgeMode = podiumBadgeMode || (showChampionsBadge ? PODIUM_BADGE_MODE.CHAMPION : null);
  const podiumBadge = getPodiumBadgeVisuals(activeBadgeMode);
  const showPodiumBadge = Boolean(podiumBadge);
  return (
    <section className="relative flex-1 shrink overflow-hidden bg-[#0d6c3d]">
      <CrowdBackdrop crowdColours={assets.crowdColours} />
      <LedAdvertisingHoard />
      {showPodiumBadge && (
        <div
          className="pointer-events-none absolute left-1/2 z-[7] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ top: `${(goalLine - 8) / 2}%`, width: "40%", height: "30%" }}
          aria-hidden="true"
        >
          <div
            className="absolute left-1/2 top-1/2 h-[76%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ background: podiumBadge.glowOuter }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[54%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
            style={{ background: podiumBadge.glowInner }}
          />
          <img
            src={podiumBadge.src}
            alt={podiumBadge.alt}
            className="relative z-[1] h-full w-full object-contain"
            style={{ filter: podiumBadge.shadow }}
            draggable={false}
          />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0" style={{ top: `${goalLine}%`, backgroundImage: "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))" }} />
      <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
      <div
        className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]"
        style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }}
      />
      <GoalFrame showAim={showAim} aimDirection={aimDirection} />
      <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />
      {!hideMatchActors && !showPodiumBadge && (
        <div className="absolute z-[4] grid h-12 w-12 place-items-center rounded-full border-2 will-change-transform" style={{ left: `${keeperPoint.x}%`, top: `${keeperPoint.y}%`, background: defenderTeam.primaryColour, borderColor: defenderTeam.textColour, transform: keeperTransform(shot?.keeperDirection ?? getDirection("CM"), shotActive), transitionProperty: "left, top, transform", transitionDuration: `${keeperTravelMs(shot)}ms`, transitionTimingFunction: shotActive ? "cubic-bezier(0.18, 0.82, 0.24, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <img src={assets.goalkeeper} alt="Goalkeeper" className="h-[2.1rem] w-[2.1rem] object-contain" draggable={false} />
        </div>
      )}
      {!hideMatchActors && !showPodiumBadge && (
        <div className="absolute z-[5] grid h-10 w-10 place-items-center rounded-full border-2 will-change-transform" style={{ left: `${ballPoint.x}%`, top: `${ballPoint.y}%`, background: activeTeam.primaryColour, borderColor: activeTeam.textColour, transform: ballTransform(shotActive), transitionProperty: "left, top, transform", transitionDuration: `${shotTravelMs(shot)}ms`, transitionTimingFunction: shotActive ? "cubic-bezier(0.08, 0.78, 0.16, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <img src={assets.ball} alt="Ball" className="h-7 w-7 object-contain" draggable={false} />
        </div>
      )}
    </section>
  );
}

function ConfirmButton({ onClick, disabled = false, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="grid h-[clamp(40px,4.7vh,62px)] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[clamp(15px,2.1vh,25px)] font-black leading-none text-[#0b2d1d] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65">
      <span className="block w-full whitespace-nowrap text-center">{children}</span>
    </button>
  );
}

function ControlOverlay({
  phase,
  selected,
  setSelected,
  handleConfirmDirection,
  powerValue,
  powerCharging,
  powerFillRef,
  handleLockPower,
  accuracyValue,
  accuracyRunning,
  handleLockAccuracy,
  opponentTeam,
  endActionLabel = "MATCH COMPLETE",
  endActionEnabled = false,
  onEndAction,
}) {
  const canChoose = phase === PHASE.DIRECTION;
  const canPower = phase === PHASE.POWER;
  const canAccuracy = phase === PHASE_ACCURACY;
  const titleClass = "home-copy-bold text-center text-[clamp(16px,2.25vh,27px)] font-black tracking-[0.08em] text-[#f5f1e8] drop-shadow-md";

  return (
    <section className="pointer-events-none absolute bottom-[4.6%] left-[4%] right-[4%] z-30 h-[26%]">
      {canChoose && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%] top-[3%] flex flex-col">
          <div className={titleClass}>SHOT DIRECTION</div>
          <div className="h-[4%]" />
          <div className="grid flex-1 grid-cols-3 grid-rows-3 gap-[4%]">
            {DIRECTIONS.map((direction) => (
              <button key={direction.id} onClick={() => setSelected(direction)} className={`flex min-h-0 items-center justify-center overflow-hidden rounded-[clamp(14px,2.2vh,28px)] border home-copy-bold text-[clamp(16px,2.15vh,26px)] font-black leading-none shadow-lg ring-1 transition-all ${selected.id === direction.id ? "border-[#F5F1E8]/55 bg-[#F7D117] text-[#0b2d1d] ring-[#F7D117]/35 shadow-[0_0_12px_rgba(247,209,23,0.20),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.18)]" : "border-[#F5F1E8]/22 bg-[#0b2d1d] text-[#f5f1e8] ring-[#0B5F35]/50 shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(245,241,232,0.08)]"}`}>
                <span className="flex h-full w-full max-h-full max-w-full items-center justify-center leading-none">{direction.arrow}</span>
              </button>
            ))}
          </div>
          <div className="h-[4%]" />
          <ConfirmButton onClick={handleConfirmDirection}>CONFIRM DIRECTION</ConfirmButton>
        </div>
      )}
      {canPower && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%] flex flex-col gap-[clamp(10px,1.2vh,18px)]">
          <div className={titleClass}>SHOT POWER</div>
          <PowerChargeMeter value={powerValue} ideal={GAME.powerIdeal} charging={powerCharging} fillRef={powerFillRef} />
          <ConfirmButton onClick={handleLockPower}>TAP FOR POWER</ConfirmButton>
        </div>
      )}
      {canAccuracy && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%] flex flex-col gap-[clamp(10px,1.2vh,18px)]">
          <div className={titleClass}>SHOT ACCURACY</div>
          <AccuracyMeter value={accuracyValue} running={accuracyRunning} />
          <ConfirmButton onClick={handleLockAccuracy}>TAP FOR ACCURACY</ConfirmButton>
        </div>
      )}
      {!canChoose && !canPower && !canAccuracy && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%]">
          <ConfirmButton onClick={endActionEnabled ? onEndAction : undefined} disabled={!endActionEnabled}>
            {phase === PHASE.SHOT ? "SHOT IN PROGRESS" : phase === PHASE.AI_WAIT ? `${opponentTeam.name.toUpperCase()} SHOOTING` : endActionLabel}
          </ConfirmButton>
        </div>
      )}
    </section>
  );
}

export default function FootballGame({ userTeam, opponentTeam, fixture, assets = {}, onMatchComplete, completedResult = null, endActionLabel = "MATCH COMPLETE", endActionEnabled = false, onEndAction, showChampionsBadge = false, podiumBadgeMode = null, activeCosmetics: activeCosmeticsProp = null }) {
  const user = useMemo(() => normaliseTeam(userTeam, "Team A"), [userTeam]);
  const opponent = useMemo(() => normaliseTeam(opponentTeam, "Team B"), [opponentTeam]);
  const storedActiveCosmetics = useMemo(() => readActiveCosmetics(), [fixture?.id, completedResult?.fixtureId, completedResult?.matchNo]);
  const activeCosmetics = activeCosmeticsProp || storedActiveCosmetics || {};
  const mergedAssets = useMemo(() => ({
    ...DEFAULT_ASSETS,
    ...assets,
    ball: activeCosmetics?.goldenBall ? GOLDEN_BALL_SRC : (assets?.ball || DEFAULT_ASSETS.ball),
    goalkeeper: activeCosmetics?.goldenGlove ? GOLDEN_GLOVE_SRC : (assets?.goalkeeper || DEFAULT_ASSETS.goalkeeper),
    sounds: { ...DEFAULT_ASSETS.sounds, ...(assets?.sounds || {}) },
  }), [assets, activeCosmetics]);
  const stageLabel = stageLabelForFixture(fixture);

  const [phase, setPhase] = useState(PHASE.DIRECTION);
  const [shootingSide, setShootingSide] = useState("user");
  const [selected, setSelected] = useState(getDirection("CM"));
  const [lockedDirection, setLockedDirection] = useState(null);
  const [powerValue, setPowerValue] = useState(0);
  const [powerCharging, setPowerCharging] = useState(false);
  const [lockedPower, setLockedPower] = useState(null);
  const [accuracyValue, setAccuracyValue] = useState(50);
  const [accuracyRunning, setAccuracyRunning] = useState(false);
  const powerValueRef = useRef(0);
  const powerFrameRef = useRef(null);
  const powerLastFrameRef = useRef(0);
  const powerDirectionRef = useRef(1);
  const powerFillRef = useRef(null);
  const accuracyValueRef = useRef(50);
  const accuracyFrameRef = useRef(null);
  const accuracyLastFrameRef = useRef(0);
  const accuracyDirectionRef = useRef(1);
  const [score, setScore] = useState({ user: 0, opponent: 0 });
  const [attempts, setAttempts] = useState({ user: [], opponent: [] });
  const [shot, setShot] = useState(null);
  const [ticker, setTicker] = useState(`${user.name.toUpperCase()} TO SHOOT`);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [winnerSide, setWinnerSide] = useState(null);

  const activeTeam = shootingSide === "user" ? user : opponent;
  const defenderTeam = shootingSide === "user" ? opponent : user;
  const shotActive = phase === PHASE.SHOT && Boolean(shot);
  const ballPoint = shot?.targetPoint ?? GAME.spot;
  const keeperPoint = shot ? pointForDirection(shot.keeperDirection) : pointForDirection(getDirection("CM"));
  const aimDirection = lockedDirection ?? selected;
  const showAim = phase === PHASE.DIRECTION || phase === PHASE.POWER || phase === PHASE_ACCURACY;

  const isKnockoutShootout = Boolean(fixture?.requiresWinner);
  const matchFinished = phase === PHASE.FINISHED || hasCompleted;
  const afterRegulationTie =
    isKnockoutShootout &&
    attempts.user.length >= GAME.regulationPens &&
    attempts.opponent.length >= GAME.regulationPens &&
    score.user === score.opponent;
  const startingUserSuddenDeath =
    afterRegulationTie &&
    !matchFinished &&
    shootingSide === "user" &&
    phase === PHASE.DIRECTION;
  const hideMatchActors = matchFinished;

  const suddenDeathMarkerSlots = Math.max(
    GAME.regulationPens,
    attempts.user.length,
    attempts.opponent.length,
    startingUserSuddenDeath ? Math.max(attempts.user.length, attempts.opponent.length) + 1 : 0
  );


  const resetGame = () => {
    setPhase(PHASE.DIRECTION);
    setShootingSide("user");
    setSelected(getDirection("CM"));
    setLockedDirection(null);
    setPowerValue(0);
    powerValueRef.current = 0;
    setPowerCharging(false);
    setLockedPower(null);
    setAccuracyValue(50);
    accuracyValueRef.current = 50;
    setAccuracyRunning(false);
    if (powerFrameRef.current) cancelAnimationFrame(powerFrameRef.current);
    if (accuracyFrameRef.current) cancelAnimationFrame(accuracyFrameRef.current);
    setScore({ user: 0, opponent: 0 });
    setAttempts({ user: [], opponent: [] });
    setShot(null);
    setTicker(`${user.name.toUpperCase()} TO SHOOT`);
    setHasCompleted(false);
    setWinnerSide(null);
  };

  useEffect(() => {
    if (completedResult) {
      const userIsHome = completedResult.home === user.id;
      setScore({
        user: userIsHome ? completedResult.homeGoals : completedResult.awayGoals,
        opponent: userIsHome ? completedResult.awayGoals : completedResult.homeGoals,
      });
      setShot(null);
      setShootingSide("user");
      setWinnerSide(completedResult.isDraw ? null : completedResult.won ? "user" : "opponent");
      setTicker(completedResult.isDraw ? "DRAW!" : `${(completedResult.won ? user.name : opponent.name).toUpperCase()} WINS!`);
      setPhase(PHASE.FINISHED);
      setHasCompleted(true);
      return;
    }
    resetGame();
    // The fixture id is the parent-controlled reset boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture?.id, user.id, opponent.id, completedResult?.fixtureId, completedResult?.matchNo]);

  function finishTurn(nextAttempts, nextScore, side) {
    const matchState = decideMatchState({ attempts: nextAttempts, score: nextScore, fixture });
    if (matchState.finished) {
      const result = buildResult({ fixture, userTeam: user, opponentTeam: opponent, score: nextScore, winnerSide: matchState.winnerSide, isDraw: matchState.draw, attempts: nextAttempts });
      setPhase(PHASE.FINISHED);
      setWinnerSide(matchState.winnerSide);
      const winnerName = matchState.winnerSide === "user" ? user.name : opponent.name;
      setTicker(matchState.draw ? "DRAW!" : `${winnerName.toUpperCase()} WINS!`);
      setHasCompleted(true);
      onMatchComplete?.(result);
      return;
    }

    if (side === "user") {
      setShootingSide("opponent");
      setTicker(`${opponent.name.toUpperCase()} TO SHOOT`);
      setShot(null);
      setPhase(PHASE.AI_WAIT);
      window.setTimeout(() => {
        const aiDirection = randomDirection();
        const aiAttempt = buildAiPenaltyAttempt({ team: opponent, direction: aiDirection });
        commitShot("opponent", aiDirection, aiAttempt.power, nextScore, nextAttempts, aiAttempt.keeperDirection);
      }, GAME.aiWaitMs);
      return;
    }

    setShootingSide("user");
    setTicker(`${user.name.toUpperCase()} TO SHOOT`);
    setShot(null);
    setSelected(getDirection("CM"));
    setLockedDirection(null);
    setPowerValue(0);
    powerValueRef.current = 0;
    setPowerCharging(false);
    setLockedPower(null);
    setAccuracyValue(50);
    accuracyValueRef.current = 50;
    setAccuracyRunning(false);
    setPhase(PHASE.DIRECTION);
  }

  function commitShot(side, direction, power, currentScore = score, currentAttempts = attempts, plannedKeeperDirection = null, accuracy = null) {
    if (hasCompleted) return;
    playSound(side === "user" ? mergedAssets.sounds.userShot : mergedAssets.sounds.opponentShot, side === "user" ? 0.9 : 0.82);
    let keeperDirection = plannedKeeperDirection || (side === "user" ? keeperReadDirection(direction, Math.random, { goalAssist: activeCosmetics?.goldenBall ? 0.10 : 0 }) : randomDirection());
    if (side === "opponent" && activeCosmetics?.goldenGlove && Math.random() < 0.10) {
      keeperDirection = direction;
    }
    const resolved = resolvePenalty({
      direction,
      power,
      keeperDirection,
      middleBypass: false,
    });
    const attemptRecord = {
      result: resolved.result,
      goal: Boolean(resolved.goal),
      power,
      accuracy,
      targetZone: Number(power) >= GAME.powerIdeal[0] && Number(power) <= GAME.powerIdeal[1],
      directionId: direction?.id,
      row: direction?.row,
      col: direction?.col,
      quality: resolved.quality,
      isSuddenDeath: currentAttempts[side].length >= GAME.regulationPens,
    };
    const nextScore = { ...currentScore, [side]: currentScore[side] + (resolved.goal ? 1 : 0) };
    const nextAttempts = { ...currentAttempts, [side]: [...currentAttempts[side], attemptRecord] };

    setShot({ ...resolved, accuracy });
    setShootingSide(side);
    setScore(nextScore);
    setAttempts(nextAttempts);
    setTicker(resolved.commentary);
    setPhase(PHASE.SHOT);
    window.setTimeout(() => finishTurn(nextAttempts, nextScore, side), GAME.shotMs);
  }

  function handleConfirmDirection() {
    if (phase !== PHASE.DIRECTION) return;
    setLockedDirection(selected);
    setPowerValue(0);
    powerValueRef.current = 0;
    setPowerCharging(false);
    setLockedPower(null);
    setAccuracyValue(50);
    accuracyValueRef.current = 50;
    setAccuracyRunning(false);
    setPhase(PHASE.POWER);
  }

  function setPowerVisual(nextPower) {
    const safePower = clamp(nextPower, 0, 100);
    powerValueRef.current = safePower;
    if (powerFillRef.current) {
      powerFillRef.current.style.width = `${safePower}%`;
    }
    setPowerValue(safePower);
  }

  function setAccuracyVisual(nextAccuracy) {
    const safeAccuracy = clamp(nextAccuracy, 0, 100);
    accuracyValueRef.current = safeAccuracy;
    setAccuracyValue(safeAccuracy);
  }

  function stopPowerFrame() {
    if (powerFrameRef.current) {
      cancelAnimationFrame(powerFrameRef.current);
      powerFrameRef.current = null;
    }
  }

  function stopAccuracyFrame() {
    if (accuracyFrameRef.current) {
      cancelAnimationFrame(accuracyFrameRef.current);
      accuracyFrameRef.current = null;
    }
  }

  function startPowerMeter() {
    stopPowerFrame();
    setPowerCharging(true);
    powerDirectionRef.current = 1;
    powerLastFrameRef.current = performance.now();
    setPowerVisual(0);

    const sweepPerMs = 100 / Math.max(1, POWER_SWEEP_MS / 2);
    const tick = (now) => {
      const delta = Math.min(Math.max(now - powerLastFrameRef.current, 0), 34);
      powerLastFrameRef.current = now;
      let next = powerValueRef.current + powerDirectionRef.current * delta * sweepPerMs;

      if (next >= 100) {
        next = 100;
        powerDirectionRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        powerDirectionRef.current = 1;
      }

      setPowerVisual(next);
      powerFrameRef.current = requestAnimationFrame(tick);
    };

    powerFrameRef.current = requestAnimationFrame(tick);
  }

  function startAccuracyMeter() {
    stopAccuracyFrame();
    setAccuracyRunning(true);
    accuracyDirectionRef.current = 1;
    accuracyLastFrameRef.current = performance.now();
    setAccuracyVisual(50);

    const sweepPerMs = 100 / Math.max(1, ACCURACY_SWEEP_MS / 2);
    const tick = (now) => {
      const delta = Math.min(Math.max(now - accuracyLastFrameRef.current, 0), 34);
      accuracyLastFrameRef.current = now;
      let next = accuracyValueRef.current + accuracyDirectionRef.current * delta * sweepPerMs;

      if (next >= 100) {
        next = 100;
        accuracyDirectionRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        accuracyDirectionRef.current = 1;
      }

      setAccuracyVisual(next);
      accuracyFrameRef.current = requestAnimationFrame(tick);
    };

    accuracyFrameRef.current = requestAnimationFrame(tick);
  }

  function handleLockPower(event) {
    if (phase !== PHASE.POWER || !lockedDirection || hasCompleted) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    stopPowerFrame();
    setPowerCharging(false);
    const finalPower = clamp(powerValueRef.current, 0, 100);
    setLockedPower(finalPower);
    setAccuracyValue(50);
    accuracyValueRef.current = 50;
    setPhase(PHASE_ACCURACY);
  }

  function handleLockAccuracy(event) {
    if (phase !== PHASE_ACCURACY || !lockedDirection || hasCompleted) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    stopAccuracyFrame();
    setAccuracyRunning(false);
    const finalAccuracy = clamp(accuracyValueRef.current, 0, 100);
    const rawPower = clamp(lockedPower ?? powerValueRef.current, 0, 100);
    const accuracyOffset = (finalAccuracy - 50) * 0.7;
    const finalPower = clamp(rawPower + accuracyOffset, 0, 100);
    commitShot("user", lockedDirection, finalPower, score, attempts, null, finalAccuracy);
  }

  useEffect(() => {
    if (phase === PHASE.POWER && lockedDirection && !hasCompleted) {
      startPowerMeter();
      return () => stopPowerFrame();
    }
    stopPowerFrame();
    setPowerCharging(false);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lockedDirection?.id, hasCompleted]);

  useEffect(() => {
    if (phase === PHASE_ACCURACY && lockedDirection && !hasCompleted) {
      startAccuracyMeter();
      return () => stopAccuracyFrame();
    }
    stopAccuracyFrame();
    setAccuracyRunning(false);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lockedDirection?.id, hasCompleted]);

  useEffect(() => {
    return () => {
      stopPowerFrame();
      stopAccuracyFrame();
    };
  }, []);

  function tickerStyle() {
    const finalTeam = winnerSide === "user" ? user : winnerSide === "opponent" ? opponent : null;
    if (phase === PHASE.FINISHED && finalTeam) return { background: finalTeam.primaryColour, color: finalTeam.textColour };
    if (phase === PHASE.FINISHED && !finalTeam) return { background: user.primaryColour, color: user.textColour };
    if (ticker === COMMENTARY.goal) return { background: activeTeam.primaryColour, color: activeTeam.textColour, animation: "goalFlash 0.82s steps(1, end) 1 forwards", "--goal-bg": activeTeam.primaryColour, "--goal-fg": activeTeam.textColour };
    if (ticker === COMMENTARY.save) return { background: defenderTeam.primaryColour, color: defenderTeam.textColour };
    return { background: activeTeam.primaryColour, color: activeTeam.textColour };
  }

  return (
    <div className="home-main-font relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0d6c3d] text-[#f5f1e8]">
      <style>{`
        .led-text-glow { color: #F7D117; text-shadow: 0 0 2px rgba(247,209,23,0.30), 0 0 5px rgba(247,209,23,0.13); }
        .pen-marker-goal { box-shadow: 0 0 5px rgba(34,197,94,0.72), 0 0 10px rgba(34,197,94,0.25); }
        .pen-marker-save { box-shadow: 0 0 5px rgba(239,68,68,0.72), 0 0 10px rgba(239,68,68,0.25); }
        .pen-marker-empty { box-shadow: 0 0 5px rgba(247,209,23,0.42), 0 0 9px rgba(247,209,23,0.18); }
        @keyframes goalFlash {
          0%, 19.9% { background: var(--goal-bg); color: var(--goal-fg); }
          20%, 39.9% { background: var(--goal-fg); color: var(--goal-bg); }
          40%, 59.9% { background: var(--goal-bg); color: var(--goal-fg); }
          60%, 79.9% { background: var(--goal-fg); color: var(--goal-bg); }
          80%, 100% { background: var(--goal-bg); color: var(--goal-fg); }
        }
      `}</style>
      <Scoreboard userTeam={user} opponentTeam={opponent} score={score} attempts={attempts} ticker={ticker} tickerStyle={tickerStyle()} stageLabel={stageLabel} totalMarkerSlots={suddenDeathMarkerSlots} />
      <Pitch ballPoint={ballPoint} keeperPoint={keeperPoint} shot={shot} shotActive={shotActive} activeTeam={activeTeam} defenderTeam={defenderTeam} showAim={showAim} aimDirection={aimDirection} assets={mergedAssets} showChampionsBadge={showChampionsBadge} podiumBadgeMode={podiumBadgeMode} hideMatchActors={hideMatchActors} />
      <ControlOverlay
        phase={phase}
        selected={selected}
        setSelected={setSelected}
        handleConfirmDirection={handleConfirmDirection}
        powerValue={powerValue}
        powerCharging={powerCharging}
        powerFillRef={powerFillRef}
        handleLockPower={handleLockPower}
        accuracyValue={accuracyValue}
        accuracyRunning={accuracyRunning}
        handleLockAccuracy={handleLockAccuracy}
        opponentTeam={opponent}
        endActionLabel={endActionLabel}
        endActionEnabled={endActionEnabled}
        onEndAction={onEndAction}
      />
    </div>
  );
}
