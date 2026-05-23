import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "../shared.jsx";
import { usePenaltyMeter } from "../../hooks/usePenaltyMeter.js";
import {
  COMMENTARY,
  DEFAULT_ASSETS,
  DIRECTIONS,
  GAME,
  LED_YELLOW,
  PHASE,
  aiMeterValue,
  ballTransform,
  buildResult,
  decideMatchState,
  getDirection,
  keeperTransform,
  keeperTravelMs,
  normaliseTeam,
  playSound,
  pointForDirection,
  randomDirection,
  resolvePenalty,
  shotTravelMs,
  stageLabelForFixture,
  visiblePenaltyMarkers,
} from "../../logic/penaltyEngine.js";

function TeamFlag({ team, className = "h-4 w-6" }) {
  if (team.flag) return <img src={team.flag} alt={`${team.name} flag`} className={`${className} rounded-sm object-cover`} draggable={false} />;
  return <Flag team={team.name} className={className} />;
}

function PenaltyMarkers({ attempts, totalSlots = GAME.regulationPens }) {
  const visible = visiblePenaltyMarkers(attempts);
  return (
    <div className="flex w-full justify-center gap-1">
      {Array.from({ length: totalSlots }).map((_, idx) => {
        const value = visible[idx];
        const color = value === "G" ? "bg-green-500 pen-marker-goal" : value === "S" ? "bg-red-500 pen-marker-save" : "bg-[#F7D117] pen-marker-empty";
        return <span key={idx} className={`h-2 w-2 rounded-full ${color}`} />;
      })}
    </div>
  );
}

function Scoreboard({ userTeam, opponentTeam, score, attempts, ticker, tickerStyle, stageLabel, totalMarkerSlots = GAME.regulationPens }) {
  return (
    <section className="relative h-[16.5%] shrink-0 overflow-hidden bg-[#050505]">
      <div
        className="absolute inset-0 opacity-50"
        style={{ backgroundImage: "radial-gradient(circle, rgba(247,209,23,0.24) 1px, transparent 1.8px)", backgroundSize: "6px 6px" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
      <div className="relative z-[1] h-full">
        <div className="led-text-glow grid h-[22%] place-items-center py-[2%] text-center font-sans text-[clamp(10px,1.6vh,20px)] font-black uppercase tracking-[0.14em] text-[#F7D117]">
          {stageLabel || "GROUP STAGE"}
        </div>
        <div className="h-[52%] px-[3.5%] pt-[1%]">
          <div className="grid h-full grid-cols-[12%_minmax(72px,1fr)_36px_16px_36px_minmax(72px,1fr)_12%] grid-rows-[58%_42%] items-center">
            <div className="col-start-1 row-start-1 flex items-center justify-center"><TeamFlag team={userTeam} className="h-4 w-6" /></div>
            <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-center px-[2%]"><div className="led-text-glow w-full text-center font-sans text-[clamp(20px,3.8vh,42px)] font-black leading-none tracking-tight text-[#F7D117]">{userTeam.code}</div></div>
            <div className="led-text-glow col-start-3 row-start-1 flex items-center justify-center font-sans text-[clamp(24px,4vh,48px)] font-black leading-none tracking-tight text-[#F7D117] tabular-nums">{score.user}</div>
            <div className="led-text-glow col-start-4 row-start-1 flex items-center justify-center font-sans text-[clamp(24px,4vh,48px)] font-black leading-none tracking-tight text-[#F7D117]">-</div>
            <div className="led-text-glow col-start-5 row-start-1 flex items-center justify-center font-sans text-[clamp(24px,4vh,48px)] font-black leading-none tracking-tight text-[#F7D117] tabular-nums">{score.opponent}</div>
            <div className="col-start-6 row-start-1 flex min-w-0 items-center justify-center px-[2%]"><div className="led-text-glow w-full text-center font-sans text-[clamp(20px,3.8vh,42px)] font-black leading-none tracking-tight text-[#F7D117]">{opponentTeam.code}</div></div>
            <div className="col-start-7 row-start-1 flex items-center justify-center"><TeamFlag team={opponentTeam} className="h-4 w-6" /></div>
            <div className="col-start-2 row-start-2 flex justify-center pt-[2%]"><div className="flex min-w-[4.4em] justify-center"><PenaltyMarkers attempts={attempts.user} totalSlots={totalMarkerSlots} /></div></div>
            <div className="col-start-6 row-start-2 flex justify-center pt-[2%]"><div className="flex min-w-[4.4em] justify-center"><PenaltyMarkers attempts={attempts.opponent} totalSlots={totalMarkerSlots} /></div></div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 z-[5] w-full overflow-hidden text-center font-sans text-[clamp(13px,2.3vh,28px)] font-black leading-none tracking-tight"
          style={{
            bottom: "-2px",
            height: "calc(26% + 2px)",
            background: "#050505",
            isolation: "isolate",
            boxShadow: "none",
            outline: "1px solid transparent",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 grid place-items-center px-[3%]"
            style={{
              ...tickerStyle,
              height: "calc(100% - 2px)",
              bottom: "2px",
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          >
            <span className="block translate-y-[-1px]">{ticker}</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-[2] h-[2px] bg-[#050505]" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function Meter({ value, ideal }) {
  return (
    <div className="h-8 rounded-[clamp(14px,2.2vh,28px)] bg-[#0b2d1d] p-1">
      <div className="relative h-full overflow-hidden rounded-[clamp(14px,2.2vh,28px)] bg-[#0b2d1d]">
        <div className="absolute top-0 h-full bg-[#0d6c3d]" style={{ left: `${ideal[0]}%`, width: `${ideal[1] - ideal[0]}%` }} />
        <div className="absolute left-1/2 top-0 z-[3] h-full w-[2px] -translate-x-1/2 bg-[#f5f1e8] shadow-[0_0_4px_rgba(245,241,232,0.7)]" />
        <div className="absolute top-0 z-[2] h-full w-1 -translate-x-1/2 bg-[#F7D117] shadow-[0_0_8px_rgba(247,209,23,0.75)]" style={{ left: `${value}%` }} />
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
    "#2DA94F", "#F7D117", "#FF1E3C", "#FF3131", "#E1251B", "#2F3ED6", "#8A1538", "#E3000F",
    "#E10600", "#1A22C9", "#2A248A", "#F7C600", "#FF8A00", "#F7D900", "#FF8500", "#3131E8",
    "#FF1744", "#9B003F", "#F20D1B", "#25308F", "#7CB5E8", "#0D47A1", "#157A52", "#D50000",
    "#93BFEA", "#00A86B", "#FF3B30", "#1E7FF0", "#2437C6", "#FFFFFF"
  ];
  const skins = ["#c98f65", "#8f5f3f", "#e0b184", "#6f4632"];
  const makeRow = ({ count, startX, step, y, scale, opacity, stagger = 0, wave = 0, shirtOffset = 0, skinOffset = 0 }) => Array.from({ length: count }, (_, i) => ({
    x: startX + i * step + (i % 2 ? stagger : 0),
    y: y + (i % 3) * wave,
    scale,
    shirt: shirts[((i * 7) + shirtOffset) % shirts.length],
    skin: skins[(i + skinOffset) % skins.length],
    pose: i % 4 === 0 || i % 7 === 0 ? "up" : "down",
    opacity,
  }));
  const crowdRows = [
    ...makeRow({ count: 42, startX: 0.5, step: 2.35, y: 4, scale: 0.4, opacity: 0.18, stagger: 0.35, wave: 0.35 }),
    ...makeRow({ count: 38, startX: 1, step: 2.6, y: 9, scale: 0.46, opacity: 0.26, stagger: 0.45, wave: 0.4, shirtOffset: 1 }),
    ...makeRow({ count: 36, startX: 1.5, step: 2.85, y: 16, scale: 0.54, opacity: 0.34, stagger: 0.55, wave: 0.5, shirtOffset: 2, skinOffset: 1 }),
    ...makeRow({ count: 34, startX: 2, step: 3.05, y: 25, scale: 0.62, opacity: 0.42, stagger: 0.65, wave: 0.55, shirtOffset: 3, skinOffset: 2 }),
    ...makeRow({ count: 32, startX: 2.5, step: 3.25, y: 36, scale: 0.7, opacity: 0.54, stagger: 0.75, wave: 0.65, shirtOffset: 4, skinOffset: 1 }),
    ...makeRow({ count: 30, startX: 3, step: 3.45, y: 49, scale: 0.78, opacity: 0.66, stagger: 0.9, wave: 0.8, shirtOffset: 0, skinOffset: 3 }),
    ...makeRow({ count: 28, startX: 3.5, step: 3.75, y: 64, scale: 0.86, opacity: 0.8, stagger: 1, wave: 0.9, shirtOffset: 2, skinOffset: 0 }),
    ...makeRow({ count: 26, startX: 4, step: 4.05, y: 80, scale: 0.94, opacity: 0.92, stagger: 1.1, wave: 0.9, shirtOffset: 1, skinOffset: 2 }),
    ...makeRow({ count: 24, startX: 4.5, step: 4.35, y: 91, scale: 0.98, opacity: 1, stagger: 1.2, wave: 0.45, shirtOffset: 3, skinOffset: 1 }),
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden bg-[#123822]" style={{ height: `${boardTop}%` }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 6%, rgba(245,241,232,0.08), transparent 20%), radial-gradient(circle at 80% 8%, rgba(255,214,0,0.05), transparent 18%), linear-gradient(180deg, rgba(4,22,14,0.4), rgba(4,22,14,0.1))" }} />
      <div className="absolute inset-x-0 top-[5%] h-[10%] bg-[#0b2d1d]/12" />
      <div className="absolute inset-x-0 top-[18%] h-[11%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[33%] h-[12%] bg-[#0b2d1d]/12" />
      {crowdRows.map((person, index) => <CrowdPerson key={index} {...person} />)}
    </div>
  );
}

function LedAdvertisingHoard({ logo }) {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-t border-[#2d2d2d] bg-[#050505] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]" style={{ top: `${goalLine - boardHeight}%`, height: `${boardHeight}%` }}>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.24) 1px, transparent 1.8px)", backgroundSize: "6px 6px" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,168,87,0.16),rgba(255,255,255,0.04),rgba(36,168,87,0.16))]" />
      <div className="relative flex h-full items-center justify-center">
        <img src={logo} alt="myMUNDIAL" className="h-[72%] max-w-[82%] object-contain opacity-95 drop-shadow-[0_0_8px_rgba(245,241,232,0.58)]" draggable={false} />
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

function Pitch({ ballPoint, keeperPoint, shot, shotActive, activeTeam, defenderTeam, showAim, aimDirection, assets }) {
  const goalLine = GAME.goal.top + GAME.goal.height;
  return (
    <section className="relative flex-1 shrink overflow-hidden bg-[#0d6c3d]">
      <CrowdBackdrop crowdColours={assets.crowdColours} />
      <LedAdvertisingHoard logo={assets.logo} />
      <div className="absolute bottom-0 left-0 right-0" style={{ top: `${goalLine}%`, backgroundImage: "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))" }} />
      <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
      <div
        className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]"
        style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }}
      />
      <GoalFrame showAim={showAim} aimDirection={aimDirection} />
      <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />
      <div className="absolute z-[4] grid h-12 w-12 place-items-center rounded-full border-2 will-change-transform" style={{ left: `${keeperPoint.x}%`, top: `${keeperPoint.y}%`, background: defenderTeam.primaryColour, borderColor: defenderTeam.textColour, transform: keeperTransform(shot?.keeperDirection ?? getDirection("CM"), shotActive), transitionProperty: "left, top, transform", transitionDuration: `${keeperTravelMs(shot)}ms`, transitionTimingFunction: shotActive ? "cubic-bezier(0.18, 0.82, 0.24, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <img src={assets.goalkeeper} alt="Goalkeeper" className="h-[2.1rem] w-[2.1rem] object-contain" draggable={false} />
      </div>
      <div className="absolute z-[5] grid h-10 w-10 place-items-center rounded-full border-2 will-change-transform" style={{ left: `${ballPoint.x}%`, top: `${ballPoint.y}%`, background: activeTeam.primaryColour, borderColor: activeTeam.textColour, transform: ballTransform(shotActive), transitionProperty: "left, top, transform", transitionDuration: `${shotTravelMs(shot)}ms`, transitionTimingFunction: shotActive ? "cubic-bezier(0.08, 0.78, 0.16, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <img src={assets.ball} alt="Ball" className="h-7 w-7 object-contain" draggable={false} />
      </div>
    </section>
  );
}

function ConfirmButton({ onClick, disabled = false, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="grid h-[clamp(40px,4.7vh,62px)] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] bg-[#F7D117] px-4 text-center text-[clamp(11px,1.6vh,19px)] font-black leading-none text-[#0b2d1d] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22)] disabled:cursor-default disabled:opacity-65">
      <span className="block w-full whitespace-nowrap text-center">{children}</span>
    </button>
  );
}

function ControlOverlay({ phase, selected, setSelected, handleConfirm, powerMeter, accuracyMeter, opponentTeam, endActionLabel = "FULL TIME", endActionEnabled = false, onEndAction }) {
  const canChoose = phase === PHASE.DIRECTION;
  const canPower = phase === PHASE.POWER;
  const canAccuracy = phase === PHASE.ACCURACY;
  const titleClass = "text-center text-[clamp(12px,1.8vh,22px)] font-black tracking-[0.08em] text-[#f5f1e8] drop-shadow-md";

  return (
    <section className="pointer-events-none absolute bottom-[4.6%] left-[4%] right-[4%] z-30 h-[26%]">
      {canChoose && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%] top-[3%] flex flex-col">
          <div className={titleClass}>SHOT DIRECTION</div>
          <div className="h-[4%]" />
          <div className="grid flex-1 grid-cols-3 grid-rows-3 gap-[4%]">
            {DIRECTIONS.map((direction) => (
              <button key={direction.id} onClick={() => setSelected(direction)} className={`grid min-h-0 place-items-center rounded-[clamp(14px,2.2vh,28px)] text-[clamp(17px,2.55vh,32px)] font-black leading-none shadow-lg transition-all ${selected.id === direction.id ? "bg-[#F7D117] text-[#0b2d1d]" : "bg-[#0b2d1d] text-[#f5f1e8]"}`}>{direction.arrow}</button>
            ))}
          </div>
          <div className="h-[4%]" />
          <ConfirmButton onClick={handleConfirm}>CONFIRM DIRECTION</ConfirmButton>
        </div>
      )}
      {canPower && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%] flex flex-col gap-[clamp(10px,1.2vh,18px)]">
          <div className={titleClass}>SHOT POWER</div><Meter value={powerMeter.value} ideal={GAME.powerIdeal} /><ConfirmButton onClick={handleConfirm}>CONFIRM POWER</ConfirmButton>
        </div>
      )}
      {canAccuracy && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%] flex flex-col gap-[clamp(10px,1.2vh,18px)]">
          <div className={titleClass}>SHOT ACCURACY</div><Meter value={accuracyMeter.value} ideal={GAME.accuracyIdeal} /><ConfirmButton onClick={handleConfirm}>CONFIRM ACCURACY</ConfirmButton>
        </div>
      )}
      {!canChoose && !canPower && !canAccuracy && (
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%]">
          <ConfirmButton onClick={endActionEnabled ? onEndAction : undefined} disabled={!endActionEnabled}>
            {phase === PHASE.SHOT ? "SHOT IN PROGRESS" : phase === PHASE.AI_WAIT ? `${opponentTeam?.name?.toUpperCase?.() || "OPPONENT"} SHOOTING` : endActionLabel}
          </ConfirmButton>
        </div>
      )}
    </section>
  );
}

export default function FootballGame({ userTeam, opponentTeam, fixture, campaignId = "default", assets = {}, onMatchComplete, completedResult = null, endActionLabel = "FULL TIME", endActionEnabled = false, onEndAction, onBusyChange }) {
  const user = useMemo(() => normaliseTeam(userTeam, "Team A"), [userTeam]);
  const opponent = useMemo(() => normaliseTeam(opponentTeam, "Team B"), [opponentTeam]);
  const mergedAssets = useMemo(() => ({ ...DEFAULT_ASSETS, ...assets, sounds: { ...DEFAULT_ASSETS.sounds, ...(assets?.sounds || {}) } }), [assets]);
  const stageLabel = stageLabelForFixture(fixture);
  const storageKey = `mondaycup-match-state:${campaignId}:${fixture?.id ?? user.id + "-" + opponent.id}`;
  const timeoutRefs = useRef([]);

  const [phase, setPhase] = useState(PHASE.DIRECTION);
  const [shootingSide, setShootingSide] = useState("user");
  const [selected, setSelected] = useState(getDirection("CM"));
  const [lockedDirection, setLockedDirection] = useState(null);
  const [lockedPower, setLockedPower] = useState(50);
  const [score, setScore] = useState({ user: 0, opponent: 0 });
  const [attempts, setAttempts] = useState({ user: [], opponent: [] });
  const [shot, setShot] = useState(null);
  const [ticker, setTicker] = useState(`${user.name.toUpperCase()} TO SHOOT`);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [winnerSide, setWinnerSide] = useState(null);

  const powerMeter = usePenaltyMeter(phase === PHASE.POWER);
  const accuracyMeter = usePenaltyMeter(phase === PHASE.ACCURACY);
  const activeTeam = shootingSide === "user" ? user : opponent;
  const defenderTeam = shootingSide === "user" ? opponent : user;
  const shotActive = phase === PHASE.SHOT && Boolean(shot);
  const ballPoint = shot?.targetPoint ?? GAME.spot;
  const keeperPoint = shot ? pointForDirection(shot.keeperDirection) : pointForDirection(getDirection("CM"));
  const aimDirection = lockedDirection ?? selected;
  const showAim = phase === PHASE.DIRECTION || phase === PHASE.POWER || phase === PHASE.ACCURACY;

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
  const suddenDeathMarkerSlots = Math.max(
    GAME.regulationPens,
    attempts.user.length,
    attempts.opponent.length,
    startingUserSuddenDeath ? Math.max(attempts.user.length, attempts.opponent.length) + 1 : 0
  );


  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id));
      timeoutRefs.current = [];
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(phase === PHASE.SHOT || phase === PHASE.AI_WAIT);
  }, [phase, onBusyChange]);


  const resetGame = () => {
    setPhase(PHASE.DIRECTION);
    setShootingSide("user");
    setSelected(getDirection("CM"));
    setLockedDirection(null);
    setLockedPower(50);
    setScore({ user: 0, opponent: 0 });
    setAttempts({ user: [], opponent: [] });
    setShot(null);
    setTicker(`${user.name.toUpperCase()} TO SHOOT`);
    setHasCompleted(false);
    setWinnerSide(null);
    powerMeter.reset();
    accuracyMeter.reset();
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
      if (completedResult.attempts) setAttempts(completedResult.attempts);
      setTicker(completedResult.isDraw ? "DRAW!" : `${(completedResult.won ? user.name : opponent.name).toUpperCase()} WINS!`);
      setPhase(PHASE.FINISHED);
      setHasCompleted(true);
      return;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
        if (saved && saved.fixtureId === fixture?.id && saved.campaignId === campaignId) {
          const restoredPhase = [PHASE.SHOT, PHASE.AI_WAIT].includes(saved.phase) ? PHASE.DIRECTION : (saved.phase || PHASE.DIRECTION);
          setPhase(saved.hasCompleted ? PHASE.FINISHED : restoredPhase);
          setShootingSide(saved.shootingSide || "user");
          setSelected(getDirection(saved.selectedId || "CM"));
          setLockedDirection(saved.lockedDirectionId ? getDirection(saved.lockedDirectionId) : null);
          setLockedPower(saved.lockedPower ?? 50);
          setScore(saved.score || { user: 0, opponent: 0 });
          setAttempts(saved.attempts || { user: [], opponent: [] });
          setShot([PHASE.SHOT, PHASE.AI_WAIT].includes(saved.phase) ? null : (saved.shot || null));
          setTicker(saved.ticker || `${user.name.toUpperCase()} TO SHOOT`);
          setHasCompleted(Boolean(saved.hasCompleted));
          setWinnerSide(saved.winnerSide || null);
          return;
        }
      } catch {}
    }
    resetGame();
    // The fixture id is the parent-controlled reset boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture?.id, user.id, opponent.id, campaignId, completedResult?.fixtureId, completedResult?.matchNo]);

  useEffect(() => {
    if (typeof window === "undefined" || completedResult) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({
        fixtureId: fixture?.id,
        campaignId,
        phase,
        shootingSide,
        selectedId: selected.id,
        lockedDirectionId: lockedDirection?.id || null,
        lockedPower,
        score,
        attempts,
        shot,
        ticker,
        hasCompleted,
        winnerSide,
      }));
    } catch {}
  }, [storageKey, completedResult, fixture?.id, campaignId, phase, shootingSide, selected.id, lockedDirection?.id, lockedPower, score, attempts, shot, ticker, hasCompleted, winnerSide]);

  function trackTimeout(callback, delay) {
    const id = window.setTimeout(() => {
      timeoutRefs.current = timeoutRefs.current.filter((item) => item !== id);
      callback();
    }, delay);
    timeoutRefs.current.push(id);
    return id;
  }

  function finishTurn(nextAttempts, nextScore, side) {
    const matchState = decideMatchState({ attempts: nextAttempts, score: nextScore, fixture });
    if (matchState.finished) {
      const result = {
        ...buildResult({ fixture, userTeam: user, opponentTeam: opponent, score: nextScore, winnerSide: matchState.winnerSide, isDraw: matchState.draw }),
        attempts: nextAttempts,
      };
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
      trackTimeout(() => commitShot("opponent", randomDirection(), aiMeterValue(), aiMeterValue(), nextScore, nextAttempts), GAME.aiWaitMs);
      return;
    }

    setShootingSide("user");
    setTicker(`${user.name.toUpperCase()} TO SHOOT`);
    setShot(null);
    setSelected(getDirection("CM"));
    setLockedDirection(null);
    setLockedPower(50);
    powerMeter.reset();
    accuracyMeter.reset();
    setPhase(PHASE.DIRECTION);
  }

  function commitShot(side, direction, power, accuracy, currentScore = score, currentAttempts = attempts) {
    if (hasCompleted) return;
    playSound(side === "user" ? mergedAssets.sounds.userShot : mergedAssets.sounds.opponentShot, side === "user" ? 0.9 : 0.82);
    const resolved = resolvePenalty({ direction, power, accuracy, keeperDirection: randomDirection() });
    const nextScore = { ...currentScore, [side]: currentScore[side] + (resolved.goal ? 1 : 0) };
    const nextAttempts = { ...currentAttempts, [side]: [...currentAttempts[side], resolved.result] };

    setShot(resolved);
    setShootingSide(side);
    setScore(nextScore);
    setAttempts(nextAttempts);
    setTicker(resolved.commentary);
    setPhase(PHASE.SHOT);
    trackTimeout(() => finishTurn(nextAttempts, nextScore, side), GAME.shotMs);
  }

  function handleConfirm() {
    if (phase === PHASE.DIRECTION) {
      setLockedDirection(selected);
      powerMeter.reset();
      setPhase(PHASE.POWER);
      return;
    }
    if (phase === PHASE.POWER && lockedDirection) {
      setLockedPower(powerMeter.value);
      accuracyMeter.reset();
      setPhase(PHASE.ACCURACY);
      return;
    }
    if (phase === PHASE.ACCURACY && lockedDirection) {
      commitShot("user", lockedDirection, lockedPower, accuracyMeter.value);
    }
  }

  function tickerStyle() {
    const finalTeam = winnerSide === "user" ? user : winnerSide === "opponent" ? opponent : null;
    if (phase === PHASE.FINISHED && finalTeam) return { background: finalTeam.primaryColour, color: finalTeam.textColour };
    if (phase === PHASE.FINISHED && !finalTeam) return { background: user.primaryColour, color: user.textColour };
    if (ticker === COMMENTARY.goal) return {
      background: activeTeam.primaryColour,
      color: activeTeam.textColour,
      animation: "goalFlashBar 0.82s steps(1, end) 1 forwards",
      "--goal-bg": activeTeam.primaryColour,
      "--goal-fg": activeTeam.textColour,
      "--goal-alt-bg": activeTeam.textColour,
      "--goal-alt-fg": activeTeam.primaryColour,
    };
    if (ticker === COMMENTARY.save) return { background: defenderTeam.primaryColour, color: defenderTeam.textColour };
    return { background: activeTeam.primaryColour, color: activeTeam.textColour };
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0d6c3d] text-[#f5f1e8]">
      <style>{`
        .led-text-glow { color: #F7D117; text-shadow: 0 0 2px rgba(247,209,23,0.30), 0 0 5px rgba(247,209,23,0.13); }
        .pen-marker-goal { box-shadow: 0 0 5px rgba(34,197,94,0.72), 0 0 10px rgba(34,197,94,0.25); }
        .pen-marker-save { box-shadow: 0 0 5px rgba(239,68,68,0.72), 0 0 10px rgba(239,68,68,0.25); }
        .pen-marker-empty { box-shadow: 0 0 5px rgba(247,209,23,0.42), 0 0 9px rgba(247,209,23,0.18); }
        @keyframes goalFlashBar {
          0%, 19.9% { background: var(--goal-bg); color: var(--goal-fg); }
          20%, 39.9% { background: var(--goal-alt-bg); color: var(--goal-alt-fg); }
          40%, 59.9% { background: var(--goal-bg); color: var(--goal-fg); }
          60%, 79.9% { background: var(--goal-alt-bg); color: var(--goal-alt-fg); }
          80%, 100% { background: var(--goal-bg); color: var(--goal-fg); }
        }
      `}</style>
      <Scoreboard userTeam={user} opponentTeam={opponent} score={score} attempts={attempts} ticker={ticker} tickerStyle={tickerStyle()} stageLabel={stageLabel} totalMarkerSlots={suddenDeathMarkerSlots} />
      <Pitch ballPoint={ballPoint} keeperPoint={keeperPoint} shot={shot} shotActive={shotActive} activeTeam={activeTeam} defenderTeam={defenderTeam} showAim={showAim} aimDirection={aimDirection} assets={mergedAssets} />
      <ControlOverlay
        phase={phase}
        selected={selected}
        setSelected={setSelected}
        handleConfirm={handleConfirm}
        powerMeter={powerMeter}
        accuracyMeter={accuracyMeter}
        opponentTeam={opponent}
        endActionLabel={endActionLabel}
        endActionEnabled={endActionEnabled}
        onEndAction={onEndAction}
      />
    </div>
  );
}
