import {
  DEFAULT_ASSETS,
  GAME,
  DIRECTIONS,
  PHASE,
  normaliseTeam,
  pointForDirection,
  getDirection,
  keeperTransform,
  ballTransform,
  shotTravelMs,
  keeperTravelMs,
} from "../../logic/penaltyEngine.js";
import { PHASE_ACCURACY } from "../../logic/shotMeter.js";
import { getPodiumBadgeVisuals } from "../../logic/matchVisuals.js";
import { PODIUM_BADGE_MODE } from "../../logic/resultStatus.js";
import SharedCrowdBackdrop from "../crowd/SharedCrowdBackdrop.jsx";

const MONDAY_CUP_AD_SRC = "/assets/branding/mondaycup_co_uk.png";

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


function CrowdBackdrop() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  const boardTop = goalLine - boardHeight;
  return (
    <SharedCrowdBackdrop
      density={1}
      rowCount={16}
      className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden"
      style={{ height: `${boardTop}%` }}
    />
  );
}

function LedAdvertisingHoard() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-t border-[#05150E] bg-[#072D1D] shadow-[0_-8px_24px_rgba(0,0,0,0.42)]" style={{ bottom: `${100 - goalLine}%`, height: `${boardHeight}%` }}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
      <div className="relative mx-auto flex h-full max-w-[61%] items-center justify-center">
        <img src={MONDAY_CUP_AD_SRC} alt="Monday Cup" className="relative z-[1] h-[69%] w-full object-contain" style={{ opacity: 0.84, filter: "brightness(0.94) drop-shadow(0 0 9px rgba(245,241,232,0.20))" }} draggable={false} crossOrigin="anonymous" />
      </div>
    </div>
  );
}


function pitchMowStyleForVariant(goalLine, variant = "game") {
  if (variant === "none") {
    return {
      top: `${goalLine}%`,
      backgroundColor: "transparent",
      backgroundImage: "none",
      backgroundSize: "100% 100%",
      backgroundRepeat: "repeat",
      boxShadow: "none",
    };
  }

  const baseStyle = {
    top: `${goalLine}%`,
    backgroundColor: "#0d6c3d",
    backgroundImage: "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))",
    backgroundSize: "100% 100%",
    backgroundRepeat: "repeat",
  };

  if (variant !== "export") return baseStyle;

  return {
    top: `${goalLine}%`,
    backgroundColor: "#0b5f35",
    backgroundImage: [
      "linear-gradient(90deg, #0f7444 0% 11.111%, #0b5f35 11.111% 22.222%, #0f7444 22.222% 33.333%, #0b5f35 33.333% 44.444%, #0f7444 44.444% 55.555%, #0b5f35 55.555% 66.666%, #0f7444 66.666% 77.777%, #0b5f35 77.777% 88.888%, #0f7444 88.888% 100%)",
      "radial-gradient(circle at 50% 0%, rgba(247,209,23,0.045), transparent 34%)",
      "linear-gradient(180deg, rgba(245,241,232,0.018) 0%, rgba(5,26,17,0.10) 100%)",
    ].join(", "),
    backgroundSize: "100% 100%, 100% 100%, 100% 100%",
    backgroundRepeat: "no-repeat",
    boxShadow: "inset 0 24px 46px rgba(4,24,15,0.06), inset 0 -42px 76px rgba(4,24,15,0.18)",
  };
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

export function Pitch({ ballPoint, keeperPoint, shot, shotActive, activeTeam, defenderTeam, showAim, aimDirection, assets, stageLabel = "GROUP STAGE", showChampionsBadge = false, podiumBadgeMode = null, hideMatchActors = false, pitchMowVariant = "game", showAdBoard = true, showPitchMarkings = true, twoPlayerMode = false }) {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const activeBadgeMode = podiumBadgeMode || (showChampionsBadge ? PODIUM_BADGE_MODE.CHAMPION : null);
  const podiumBadge = getPodiumBadgeVisuals(activeBadgeMode, { useShieldBadge: twoPlayerMode });
  const showPodiumBadge = Boolean(podiumBadge);
  return (
    <section className={`relative h-full flex-1 shrink overflow-hidden ${pitchMowVariant === "none" ? "bg-transparent" : "bg-[#0d6c3d]"}`}>
      <CrowdBackdrop />
      {showAdBoard && <LedAdvertisingHoard />}
      {showPodiumBadge && (
        <div
          className="pointer-events-none absolute left-1/2 z-[7] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ top: `${(goalLine - 8) / 2}%`, width: "99.825%", height: "74.415%" }}
          aria-hidden="true"
        >
          <div
            className="absolute left-1/2 top-[54%] h-[56%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: podiumBadge.glowOuter }}
          />
          <div
            className="absolute left-1/2 top-[54%] h-[38%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{ background: podiumBadge.glowInner }}
          />
          <img
            src={podiumBadge.src}
            alt={podiumBadge.alt}
            className="relative z-[1] h-full w-full object-contain"
            style={{ filter: podiumBadge.shadow, transform: `scale(${podiumBadge.pitchScale || 1})` }}
            draggable={false}
          />
        </div>
      )}
      <div {...(pitchMowVariant === "none" ? {} : { "data-share-force-pitch": "true" })} className="absolute bottom-0 left-0 right-0" style={pitchMowStyleForVariant(goalLine, pitchMowVariant)} />
      {showPitchMarkings && (
        <>
          <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
          <div
            className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[clamp(5px,1.55vw,8px)] border-l-[clamp(5px,1.55vw,8px)] border-r-[clamp(5px,1.55vw,8px)] border-[#f5f1e8]"
            style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }}
          />
        </>
      )}
      <GoalFrame showAim={showAim} aimDirection={aimDirection} />
      {showPitchMarkings && <div className="absolute h-[clamp(8px,2.4vw,12px)] w-[clamp(8px,2.4vw,12px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />}
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


export function MatchPitchPreview({ userTeam, opponentTeam, stageLabel = "FINAL", assets = {}, showActors = false, pitchMowVariant = "game", showAdBoard = true, showPitchMarkings = true }) {
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
      pitchMowVariant={pitchMowVariant}
      showAdBoard={showAdBoard}
      showPitchMarkings={showPitchMarkings}
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

export function ControlOverlay({
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
          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-[clamp(7px,1.55vw,13px)]">
            {DIRECTIONS.map((direction) => (
              <button key={direction.id} onClick={() => setSelected(direction)} className={`flex min-h-0 items-center justify-center overflow-hidden rounded-[clamp(14px,2.2vh,28px)] border home-copy-bold text-[clamp(16px,2.15vh,26px)] font-black leading-none shadow-lg ring-1 transition-all ${selected.id === direction.id ? "border-[#F5F1E8]/55 bg-[#F7D117] text-[#0b2d1d] ring-[#F7D117]/35 shadow-[0_0_12px_rgba(247,209,23,0.20),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.18)]" : "border-[#F5F1E8]/22 bg-[#0b2d1d] text-[#f5f1e8] ring-[#0B5F35]/50 shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(245,241,232,0.08)]"}`}>
                <span className="flex h-full w-full max-h-full max-w-full items-center justify-center leading-none">{direction.arrow}</span>
              </button>
            ))}
          </div>
          <div className="h-[5%]" />
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

export function TemporaryMatchButtons({ onPerfectWin, onRandomWin }) {
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
