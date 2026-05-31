import { useEffect, useMemo, useRef, useState } from "react";
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
  applyGoldenGloveSecondRead,
  playSound,
  decideMatchState,
  stageLabelForFixture,
  buildResult,
} from "../../logic/penaltyEngine.js";
import { Scoreboard } from "./Scoreboard.jsx";
import { GOLDEN_BALL_SRC, GOLDEN_GLOVE_SRC, readActiveCosmetics } from "../../logic/cosmetics.js";
import {
  DEFAULT_ACCURACY_SWEEP_MS,
  PHASE_ACCURACY,
  POWER_SWEEP_MS,
  accuracyOutcomeForValue,
  accuracySpeedForPower,
  displayedMeterValue,
  directionLabel,
  getAccuracyTargetZone,
  getPowerTargetZone,
  isAccuracyInTargetZone,
  isPowerInTargetZone,
  meterPoints,
} from "../../logic/shotMeter.js";
import { getPodiumBadgeVisuals } from "../../logic/matchVisuals.js";
import { PODIUM_BADGE_MODE } from "../../logic/resultStatus.js";

const MONDAY_CUP_AD_SRC = ASSETS.branding.mondayCupAd;

function PowerChargeMeter({ value, ideal = GAME.powerIdeal, charging = false, fillRef = null }) {
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
          ref={fillRef}
          className="absolute inset-y-[-2px] w-[4px] -translate-x-1/2 rounded-full bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.65)]"
          style={{ left: `${value}%`, willChange: "left" }}
        />
        <div className={`pointer-events-none absolute inset-0 ${charging ? "animate-pulse" : ""} bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(0,0,0,0.13))]`} />
      </div>
    </div>
  );
}

function AccuracyMeter({ value, ideal, running = false, fillRef = null }) {
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
          ref={fillRef}
          className="absolute inset-y-[-2px] w-[3px] -translate-x-1/2 rounded-full bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.65)]"
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

function crowdDensityForStage(stageLabel = "GROUP STAGE") {
  const label = String(stageLabel || "").toUpperCase();
  if (label.includes("FINAL")) return 1;
  if (label.includes("3RD") || label.includes("THIRD")) return 0.96;
  if (label.includes("SEMI")) return 0.92;
  if (label.includes("QUARTER")) return 0.84;
  if (label.includes("16")) return 0.76;
  if (label.includes("32")) return 0.68;
  return 0.58;
}

function CrowdBackdrop({ crowdColours = [], stageLabel = "GROUP STAGE" }) {
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

  const density = crowdDensityForStage(stageLabel);
  const rowConfigs = Array.from({ length: 16 }, (_, index) => {
    const t = index / 15;
    const y = 2.5 + 94 * Math.pow(t, 1.24);
    const baseCount = 62 - t * 34;
    return {
      count: Math.max(10, Math.round(baseCount * density)),
      step: (1.68 + t * 2.45) / density,
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
    <div className="absolute z-[3] overflow-hidden border-[clamp(5px,1.55vw,8px)] border-b-0 border-[#f5f1e8] bg-[#0d6c3d]/30" style={{ left: `${goal.left}%`, top: `${goal.top}%`, width: `${goal.width}%`, height: `${goal.height}%` }}>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent 1.8%, rgba(245,241,232,0.18) 2.0%, transparent 2.2%), repeating-linear-gradient(180deg, transparent 0%, transparent 2.6%, rgba(245,241,232,0.16) 2.8%, transparent 3.1%), linear-gradient(135deg, transparent 0%, transparent 49%, rgba(245,241,232,0.08) 49.4%, transparent 50%)", backgroundSize: "100% 100%, 100% 100%, 8px 8px" }} />
      {showAim && (
        <div className="absolute h-[clamp(30px,9vw,40px)] w-[clamp(30px,9vw,40px)] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-[3px] border-[#F7D117] bg-[#F7D117]/14 shadow-[0_0_10px_rgba(247,209,23,0.52),0_0_22px_rgba(247,209,23,0.22)]" style={{ left: `${((aimDirection.col + 0.5) / 3) * 100}%`, top: `${((aimDirection.row + 0.5) / 3) * 100}%`, animationDuration: "1.1s" }}>
          <div className="absolute inset-[-18%] animate-ping rounded-full border-2 border-[#F7D117]/70" style={{ animationDuration: "1.35s" }} />
          <div className="absolute inset-[30%] rounded-full bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.8)]" />
        </div>
      )}
    </div>
  );
}

function Pitch({ ballPoint, keeperPoint, shot, shotActive, activeTeam, defenderTeam, showAim, aimDirection, assets, stageLabel = "GROUP STAGE", showChampionsBadge = false, podiumBadgeMode = null, hideMatchActors = false }) {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const activeBadgeMode = podiumBadgeMode || (showChampionsBadge ? PODIUM_BADGE_MODE.CHAMPION : null);
  const podiumBadge = getPodiumBadgeVisuals(activeBadgeMode);
  const showPodiumBadge = Boolean(podiumBadge);
  return (
    <section className="relative h-full flex-1 shrink overflow-hidden bg-[#0d6c3d]">
      <CrowdBackdrop crowdColours={assets.crowdColours} stageLabel={stageLabel} />
      <LedAdvertisingHoard />
      {showPodiumBadge && (
        <div
          className="pointer-events-none absolute left-1/2 z-[7] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ top: `${(goalLine - 8) / 2}%`, width: "34%", height: "24%" }}
          aria-hidden="true"
        >
          <div
            className="absolute left-1/2 top-1/2 h-[86%] w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ background: podiumBadge.glowOuter }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
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
        className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[clamp(5px,1.55vw,8px)] border-l-[clamp(5px,1.55vw,8px)] border-r-[clamp(5px,1.55vw,8px)] border-[#f5f1e8]"
        style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }}
      />
      <GoalFrame showAim={showAim} aimDirection={aimDirection} />
      <div className="absolute h-[clamp(8px,2.4vw,12px)] w-[clamp(8px,2.4vw,12px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />
      {!hideMatchActors && !showPodiumBadge && (
        <div className="absolute z-[4] grid h-[clamp(38px,10.8vw,48px)] w-[clamp(38px,10.8vw,48px)] place-items-center rounded-full border-2 will-change-transform" style={{ left: `${keeperPoint.x}%`, top: `${keeperPoint.y}%`, background: defenderTeam.primaryColour, borderColor: defenderTeam.textColour, transform: keeperTransform(shot?.keeperDirection ?? getDirection("CM"), shotActive), transitionProperty: "left, top, transform", transitionDuration: `${keeperTravelMs(shot)}ms`, transitionTimingFunction: shotActive ? "cubic-bezier(0.18, 0.82, 0.24, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <img src={assets.goalkeeper} alt="Goalkeeper" className="h-[clamp(1.72rem,7.2vw,2.1rem)] w-[clamp(1.72rem,7.2vw,2.1rem)] object-contain" draggable={false} />
        </div>
      )}
      {!hideMatchActors && !showPodiumBadge && (
        <div className="absolute z-[5] grid h-[clamp(32px,9.2vw,40px)] w-[clamp(32px,9.2vw,40px)] place-items-center rounded-full border-2 will-change-transform" style={{ left: `${ballPoint.x}%`, top: `${ballPoint.y}%`, background: activeTeam.primaryColour, borderColor: activeTeam.textColour, transform: ballTransform(shotActive), transitionProperty: "left, top, transform", transitionDuration: `${shotTravelMs(shot)}ms`, transitionTimingFunction: shotActive ? "cubic-bezier(0.08, 0.78, 0.16, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <img src={assets.ball} alt="Ball" className="h-[clamp(22px,6.3vw,28px)] w-[clamp(22px,6.3vw,28px)] object-contain" draggable={false} />
        </div>
      )}
    </section>
  );
}


export function MatchPitchPreview({ userTeam, opponentTeam, stageLabel = "FINAL", assets = {}, showActors = false }) {
  const user = normaliseTeam(userTeam, "Team A");
  const opponent = normaliseTeam(opponentTeam, "Team B");
  const mergedAssets = {
    ...DEFAULT_ASSETS,
    ...assets,
    sounds: { ...DEFAULT_ASSETS.sounds, ...(assets?.sounds || {}) },
  };
  return (
    <Pitch
      ballPoint={GAME.spot}
      keeperPoint={pointForDirection(getDirection("CM"))}
      shot={null}
      shotActive={false}
      activeTeam={user}
      defenderTeam={opponent}
      showAim={false}
      aimDirection={getDirection("CM")}
      assets={mergedAssets}
      stageLabel={stageLabel}
      hideMatchActors={!showActors}
    />
  );
}

function ConfirmButton({ onClick, disabled = false, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="grid h-[clamp(44px,5.1dvh,62px)] min-h-[44px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[clamp(14px,2dvh,23px)] font-black leading-none text-[#0b2d1d] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65">
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
  powerTargetZone,
  accuracyValue,
  accuracyRunning,
  accuracyFillRef,
  handleLockAccuracy,
  accuracyTargetZone,
  opponentTeam,
  endActionLabel = "MATCH COMPLETE",
  endActionEnabled = false,
  onEndAction,
}) {
  const canChoose = phase === PHASE.DIRECTION;
  const canPower = phase === PHASE.POWER;
  const canAccuracy = phase === PHASE_ACCURACY;
  const titleClass = "home-copy-bold text-center text-[clamp(15px,2.05dvh,24px)] font-black tracking-[0.08em] text-[#f5f1e8] drop-shadow-md";

  return (
    <section className="pointer-events-none absolute bottom-[max(42px,calc(env(safe-area-inset-bottom)+30px))] left-[4%] right-[4%] z-30 h-[min(28%,176px)]">
      {canChoose && (
        <div className="pointer-events-auto absolute inset-x-[4%] bottom-0 top-0 flex flex-col">
          <div className={titleClass}>SHOT DIRECTION</div>
          <div className="h-[4%]" />
          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-[clamp(5px,1.2vw,10px)]">
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
        <div className="pointer-events-auto absolute inset-x-[4%] bottom-0 flex flex-col gap-[clamp(8px,1.05dvh,16px)]">
          <div className={titleClass}>SHOT POWER</div>
          <PowerChargeMeter value={powerValue} ideal={powerTargetZone} charging={powerCharging} fillRef={powerFillRef} />
          <ConfirmButton onClick={handleLockPower}>TAP FOR POWER</ConfirmButton>
        </div>
      )}
      {canAccuracy && (
        <div className="pointer-events-auto absolute inset-x-[4%] bottom-0 flex flex-col gap-[clamp(8px,1.05dvh,16px)]">
          <div className={titleClass}>SHOT ACCURACY</div>
          <AccuracyMeter value={accuracyValue} ideal={accuracyTargetZone} running={accuracyRunning} fillRef={accuracyFillRef} />
          <ConfirmButton onClick={handleLockAccuracy}>TAP FOR ACCURACY</ConfirmButton>
        </div>
      )}
      {!canChoose && !canPower && !canAccuracy && (
        <div className="pointer-events-auto absolute inset-x-[4%] bottom-0">
          <ConfirmButton onClick={endActionEnabled ? onEndAction : undefined} disabled={!endActionEnabled}>
            {phase === PHASE.SHOT ? "SHOT IN PROGRESS" : phase === PHASE.AI_WAIT ? `${opponentTeam.name.toUpperCase()} SHOOTING` : endActionLabel}
          </ConfirmButton>
        </div>
      )}
    </section>
  );
}

function TemporaryMatchButtons({ onPerfectWin, onRandomWin }) {
  const buttonClass = "rounded-[0.55rem] border border-[#F7D117]/24 bg-[#062819]/86 px-2.5 py-1.5 text-center home-copy-bold text-[7px] uppercase leading-none tracking-[0.08em] text-[#F7D117] shadow-[0_5px_12px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(245,241,232,0.08)] active:scale-[0.98]";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[clamp(118px,16dvh,162px)] z-40 flex justify-center">
      <div className="pointer-events-auto flex max-w-[92%] items-center justify-center gap-2 rounded-[0.75rem] border border-[#F5F1E8]/10 bg-[#031D13]/60 px-2 py-1.5 backdrop-blur-[2px]">
        <button type="button" className={buttonClass} onClick={onPerfectWin}>
          TEMP 5-0 PERFECT
        </button>
        <button type="button" className={buttonClass} onClick={onRandomWin}>
          TEMP RANDOM WIN
        </button>
      </div>
    </div>
  );
}


export default function FootballGame({ userTeam, opponentTeam, fixture, assets = {}, onMatchComplete, completedResult = null, endActionLabel = "MATCH COMPLETE", endActionEnabled = false, onEndAction, showChampionsBadge = false, podiumBadgeMode = null, activeCosmetics: activeCosmeticsProp = null }) {
  const user = useMemo(() => normaliseTeam(userTeam, "Team A"), [userTeam]);
  const opponent = useMemo(() => normaliseTeam(opponentTeam, "Team B"), [opponentTeam]);
  const storedActiveCosmetics = useMemo(() => readActiveCosmetics(), [fixture?.id, completedResult?.fixtureId, completedResult?.matchNo]);
  const activeCosmetics = activeCosmeticsProp || storedActiveCosmetics || {};
  const powerTargetZone = useMemo(() => getPowerTargetZone(activeCosmetics), [activeCosmetics]);
  const accuracyTargetZone = useMemo(() => getAccuracyTargetZone(activeCosmetics), [activeCosmetics]);
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
  const [accuracyValue, setAccuracyValue] = useState(0);
  const [accuracyRunning, setAccuracyRunning] = useState(false);
  const [accuracySweepMs, setAccuracySweepMs] = useState(DEFAULT_ACCURACY_SWEEP_MS);
  const accuracySweepMsRef = useRef(DEFAULT_ACCURACY_SWEEP_MS);
  const powerValueRef = useRef(0);
  const powerFrameRef = useRef(null);
  const powerLastFrameRef = useRef(0);
  const powerDirectionRef = useRef(1);
  const powerFillRef = useRef(null);
  const accuracyFillRef = useRef(null);
  const accuracyValueRef = useRef(0);
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
    setAccuracyValue(0);
    accuracyValueRef.current = 0;
    setAccuracyRunning(false);
    setAccuracySweepMs(DEFAULT_ACCURACY_SWEEP_MS);
    accuracySweepMsRef.current = DEFAULT_ACCURACY_SWEEP_MS;
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
        const keeperDirection = activeCosmetics?.goldenGlove
          ? applyGoldenGloveSecondRead({ targetDirection: aiDirection, firstKeeperDirection: aiAttempt.keeperDirection })
          : aiAttempt.keeperDirection;
        commitShot("opponent", aiDirection, aiAttempt.power, nextScore, nextAttempts, keeperDirection);
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
    setAccuracyValue(0);
    accuracyValueRef.current = 0;
    setAccuracyRunning(false);
    setAccuracySweepMs(DEFAULT_ACCURACY_SWEEP_MS);
    accuracySweepMsRef.current = DEFAULT_ACCURACY_SWEEP_MS;
    setPhase(PHASE.DIRECTION);
  }

  function commitShot(side, direction, power, currentScore = score, currentAttempts = attempts, plannedKeeperDirection = null, accuracy = null, accuracyOutcome = null) {
    if (hasCompleted) return;
    playSound(side === "user" ? mergedAssets.sounds.userShot : mergedAssets.sounds.opponentShot, side === "user" ? 0.9 : 0.82);
    let keeperDirection = plannedKeeperDirection || (side === "user" ? keeperReadDirection(direction, Math.random) : randomDirection());
    const resolved = resolvePenalty({
      direction,
      power,
      keeperDirection,
      middleBypass: false,
      accuracyOutcome,
    });
    const shotNumber = currentAttempts[side].length + 1;
    const safePower = clamp(Number(power) || 0, 0, 100);
    const safeAccuracy = accuracy === null || accuracy === undefined ? null : clamp(Number(accuracy) || 0, 0, 100);
    const attemptRecord = {
      shotNumber,
      side,
      result: resolved.result,
      shotResult: resolved.result,
      goal: Boolean(resolved.goal),
      power: safePower,
      powerValue: safePower,
      powerPoints: side === "user" ? meterPoints(safePower, 50) : 0,
      accuracy: safeAccuracy,
      accuracyValue: safeAccuracy,
      accuracyPoints: side === "user" ? meterPoints(safeAccuracy, 50) : 0,
      targetZone: isPowerInTargetZone(safePower, activeCosmetics),
      accuracyTargetZone: safeAccuracy !== null && isAccuracyInTargetZone(safeAccuracy, activeCosmetics),
      accuracyOutcome,
      directionSelected: directionLabel(direction),
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
    setAccuracyValue(0);
    accuracyValueRef.current = 0;
    setAccuracyRunning(false);
    setPhase(PHASE.POWER);
  }

  function setPowerVisual(nextPower) {
    const safePower = clamp(nextPower, 0, 100);
    powerValueRef.current = safePower;
    if (powerFillRef.current) {
      powerFillRef.current.style.left = `${safePower}%`;
    }
    setPowerValue(safePower);
  }

  function setAccuracyVisual(nextAccuracy) {
    const safeAccuracy = clamp(nextAccuracy, 0, 100);
    accuracyValueRef.current = safeAccuracy;
    if (accuracyFillRef.current) {
      accuracyFillRef.current.style.left = `${safeAccuracy}%`;
    }
    setAccuracyValue(safeAccuracy);
  }

  function readVisualMeterValue(fillRef, fallbackValue) {
    const rawLeft = fillRef?.current?.style?.left;
    const parsed = Number.parseFloat(String(rawLeft || "").replace("%", ""));
    return Number.isFinite(parsed) ? clamp(parsed, 0, 100) : clamp(Number(fallbackValue) || 0, 0, 100);
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
    setAccuracyVisual(0);

    const sweepPerMs = 100 / Math.max(1, accuracySweepMsRef.current / 2);
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

    // Golden Boot expands the visible power sweet spot. Use the same visual
    // needle position the player sees, then snap it to the displayed value
    // before judging the upgraded/standard power zone and accuracy speed.
    const finalPower = displayedMeterValue(readVisualMeterValue(powerFillRef, powerValueRef.current));
    powerValueRef.current = finalPower;
    setPowerValue(finalPower);

    const nextAccuracySpeed = accuracySpeedForPower(finalPower, activeCosmetics);
    setLockedPower(finalPower);
    setAccuracySweepMs(nextAccuracySpeed);
    accuracySweepMsRef.current = nextAccuracySpeed;
    setAccuracyValue(0);
    accuracyValueRef.current = 0;
    accuracyDirectionRef.current = 1;
    setPhase(PHASE_ACCURACY);
  }

  function handleLockAccuracy(event) {
    if (phase !== PHASE_ACCURACY || !lockedDirection || hasCompleted) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    stopAccuracyFrame();
    setAccuracyRunning(false);

    // Use the meter needle's visual position as the source of truth, then snap
    // to the same displayed integer value used by the outcome bands. This keeps
    // mobile touch timing, the green target band, and shot results aligned.
    const finalAccuracy = displayedMeterValue(readVisualMeterValue(accuracyFillRef, accuracyValueRef.current));
    accuracyValueRef.current = finalAccuracy;
    setAccuracyValue(finalAccuracy);

    const finalPower = clamp(lockedPower ?? powerValueRef.current, 0, 100);
    const accuracyOutcome = accuracyOutcomeForValue(finalAccuracy, lockedDirection, activeCosmetics);
    commitShot("user", lockedDirection, finalPower, score, attempts, null, finalAccuracy, accuracyOutcome);
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

  function createTempAttempt(side, shotNumber, goal, { perfect = false, isSuddenDeath = false } = {}) {
    const direction = getDirection("CM");
    const power = perfect ? 50 : Math.round(35 + Math.random() * 30);
    const accuracy = perfect ? 50 : Math.round(35 + Math.random() * 30);
    const result = goal ? "goal" : "save";

    return {
      shotNumber,
      side,
      result,
      shotResult: result,
      goal: Boolean(goal),
      power,
      powerValue: power,
      powerPoints: side === "user" ? meterPoints(power, 50) : 0,
      accuracy,
      accuracyValue: accuracy,
      accuracyPoints: side === "user" ? meterPoints(accuracy, 50) : 0,
      targetZone: side === "user" ? isPowerInTargetZone(power, activeCosmetics) : false,
      accuracyTargetZone: side === "user" ? isAccuracyInTargetZone(accuracy, activeCosmetics) : false,
      accuracyOutcome: perfect ? "onTarget" : null,
      directionSelected: directionLabel(direction),
      directionId: direction?.id,
      row: direction?.row,
      col: direction?.col,
      quality: result,
      isSuddenDeath,
      finalMatchOutcome: "win",
      userWon: side === "user",
      matchWon: side === "user",
      matchDrawn: false,
    };
  }

  function completeTemporaryWin({ userGoals = 5, opponentGoals = 0, perfect = false } = {}) {
    if (hasCompleted) return;

    stopPowerFrame();
    stopAccuracyFrame();

    const safeUserGoals = clamp(Math.round(Number(userGoals) || 1), 1, 5);
    const safeOpponentGoals = clamp(Math.round(Number(opponentGoals) || 0), 0, Math.max(0, safeUserGoals - 1));
    const userAttempts = Array.from({ length: 5 }).map((_, index) =>
      createTempAttempt("user", index + 1, index < safeUserGoals, { perfect })
    );
    const opponentAttempts = Array.from({ length: 5 }).map((_, index) =>
      createTempAttempt("opponent", index + 1, index < safeOpponentGoals, { perfect: false })
    );
    const nextScore = { user: safeUserGoals, opponent: safeOpponentGoals };
    const nextAttempts = { user: userAttempts, opponent: opponentAttempts };
    const result = buildResult({
      fixture,
      userTeam: user,
      opponentTeam: opponent,
      score: nextScore,
      winnerSide: "user",
      isDraw: false,
      attempts: nextAttempts,
    });

    setScore(nextScore);
    setAttempts(nextAttempts);
    setShot(null);
    setShootingSide("user");
    setPhase(PHASE.FINISHED);
    setWinnerSide("user");
    setTicker(`${user.name.toUpperCase()} WINS!`);
    setHasCompleted(true);
    onMatchComplete?.(result);
  }

  function completeTemporaryPerfectWin() {
    completeTemporaryWin({ userGoals: 5, opponentGoals: 0, perfect: true });
  }

  function completeTemporaryRandomWin() {
    const userGoals = 1 + Math.floor(Math.random() * 5);
    const opponentGoals = Math.floor(Math.random() * userGoals);
    completeTemporaryWin({ userGoals, opponentGoals, perfect: false });
  }

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
      {!hasCompleted && (
        <TemporaryMatchButtons
          onPerfectWin={completeTemporaryPerfectWin}
          onRandomWin={completeTemporaryRandomWin}
        />
      )}
      <Pitch ballPoint={ballPoint} keeperPoint={keeperPoint} shot={shot} shotActive={shotActive} activeTeam={activeTeam} defenderTeam={defenderTeam} showAim={showAim} aimDirection={aimDirection} assets={mergedAssets} stageLabel={stageLabel} showChampionsBadge={showChampionsBadge} podiumBadgeMode={podiumBadgeMode} hideMatchActors={hideMatchActors} />
      <ControlOverlay
        phase={phase}
        selected={selected}
        setSelected={setSelected}
        handleConfirmDirection={handleConfirmDirection}
        powerValue={powerValue}
        powerCharging={powerCharging}
        powerFillRef={powerFillRef}
        handleLockPower={handleLockPower}
        powerTargetZone={powerTargetZone}
        accuracyValue={accuracyValue}
        accuracyRunning={accuracyRunning}
        accuracyFillRef={accuracyFillRef}
        handleLockAccuracy={handleLockAccuracy}
        accuracyTargetZone={accuracyTargetZone}
        opponentTeam={opponent}
        endActionLabel={endActionLabel}
        endActionEnabled={endActionEnabled}
        onEndAction={onEndAction}
      />
    </div>
  );
}
