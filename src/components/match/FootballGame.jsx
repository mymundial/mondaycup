import { useEffect, useMemo, useState } from "react";
import { Flag } from "../shared.jsx";

const DEFAULT_ASSETS = {
  logo: "https://raw.githubusercontent.com/mymundial/mymundial/ad679ee2973445fc1c1c856603f6baf5695d90c6/LOGO-wht.png",
  ball: "https://raw.githubusercontent.com/mymundial/mymundial/3cd00c542143f4f8f1be14d7428f422ca329da49/ball.png",
  goalkeeper: "https://raw.githubusercontent.com/mymundial/mymundial/9234c87039f1954da79be54541aba9cac9cfbcdc/gk.png",
  sounds: {
    userShot: "https://raw.githubusercontent.com/mymundial/mymundial/415282fcde8c537de643f76e83d168f413ee6735/shot2mon.wav",
    opponentShot: "https://raw.githubusercontent.com/mymundial/mymundial/415282fcde8c537de643f76e83d168f413ee6735/Shot5.wav",
  },
};

const LED_YELLOW = "#F7D117";

const GAME = {
  regulationPens: 5,
  meterStep: 4,
  meterTickMs: 24,
  powerIdeal: [40, 60],
  accuracyIdeal: [40, 60],
  shotMs: 950,
  aiWaitMs: 500,
  goal: { left: 10, top: 8, width: 80, height: 30 },
  spot: { x: 50, y: 54.5 },
};

const DIRECTIONS = [
  { id: "LT", arrow: "↖", row: 0, col: 0 },
  { id: "CT", arrow: "↑", row: 0, col: 1 },
  { id: "RT", arrow: "↗", row: 0, col: 2 },
  { id: "LM", arrow: "←", row: 1, col: 0 },
  { id: "CM", arrow: "•", row: 1, col: 1 },
  { id: "RM", arrow: "→", row: 1, col: 2 },
  { id: "LB", arrow: "↙", row: 2, col: 0 },
  { id: "CB", arrow: "↓", row: 2, col: 1 },
  { id: "RB", arrow: "↘", row: 2, col: 2 },
];

const PHASE = {
  DIRECTION: "direction",
  POWER: "power",
  ACCURACY: "accuracy",
  SHOT: "shot",
  AI_WAIT: "ai-wait",
  FINISHED: "finished",
};

const COMMENTARY = {
  goal: "GOAL!",
  save: "SAVE!",
  wide: "WIDE!",
  over: "OVER!",
  post: "HIT THE POST!",
  bar: "HIT THE CROSSBAR!",
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const getDirection = (id) => DIRECTIONS.find((direction) => direction.id === id) ?? DIRECTIONS[4];
const randomDirection = () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
const findDirection = (row, col, fallback) => DIRECTIONS.find((direction) => direction.row === row && direction.col === col) ?? fallback;

function normaliseTeam(team, fallback) {
  const name = team?.name || team?.id || fallback;
  return {
    id: team?.id || name,
    name,
    code: team?.code || String(name).slice(0, 3).toUpperCase(),
    flag: team?.flag || "",
    primaryColour: team?.primaryColour || "#0B5F35",
    textColour: team?.textColour || "#F5F0E6",
  };
}

function pointForDirection(direction) {
  const goal = GAME.goal;
  return {
    x: goal.left + goal.width * ((direction.col + 0.5) / 3),
    y: goal.top + goal.height * ((direction.row + 0.5) / 3),
  };
}

function pointForOutcome(outcome, direction) {
  const goal = GAME.goal;
  const base = pointForDirection(direction);
  const leftPost = goal.left;
  const rightPost = goal.left + goal.width;
  const bar = goal.top;

  switch (outcome) {
    case "LTP":
    case "LMP":
    case "LBP":
      return { x: leftPost, y: base.y };
    case "RTP":
    case "RMP":
    case "RBP":
      return { x: rightPost, y: base.y };
    case "LX":
      return { x: goal.left + goal.width * (1 / 6), y: bar };
    case "CX":
      return { x: goal.left + goal.width * (3 / 6), y: bar };
    case "RX":
      return { x: goal.left + goal.width * (5 / 6), y: bar };
    case "LO":
      return { x: goal.left + goal.width * (1 / 6), y: goal.top - 8 };
    case "CO":
      return { x: goal.left + goal.width * (3 / 6), y: goal.top - 8 };
    case "RO":
      return { x: goal.left + goal.width * (5 / 6), y: goal.top - 8 };
    case "LTW":
    case "LMW":
    case "LBW":
      return { x: goal.left - 7, y: base.y };
    case "RTW":
    case "RMW":
    case "RBW":
      return { x: goal.left + goal.width + 7, y: base.y };
    default:
      return base;
  }
}

function directionVector(direction) {
  return { x: direction.col - 1, y: direction.row - 1 };
}

function keeperTransform(direction, active) {
  const vector = directionVector(direction);
  const rotation = vector.x === 0 ? 0 : vector.x > 0 ? 18 : -18;
  const scale = active ? 1.08 : 1;
  const lift = active && vector.y !== 0 ? -1 : 0;
  return `translate(-50%, -50%) translateY(${lift}px) rotate(${rotation}deg) scale(${scale})`;
}

function ballTransform(active) {
  return `translate(-50%, -50%) scale(${active ? 0.8 : 1}) rotate(${active ? 42 : 0}deg)`;
}

function shotTravelMs(shot) {
  if (!shot) return 520;
  return Math.round(clamp(980 - shot.power * 3.4, 560, 860));
}

function keeperTravelMs(shot) {
  if (!shot) return 420;
  return Math.round(clamp(620 - shot.power * 1.2, 430, 620));
}

function classifyPower(power) {
  if (power >= GAME.powerIdeal[0] && power <= GAME.powerIdeal[1]) return "good";
  if (power < 25 || power > 78) return "very-poor";
  if (power < 35 || power > 65) return "poor";
  return "ok";
}

function classifyAccuracy(accuracy) {
  if (accuracy >= GAME.accuracyIdeal[0] && accuracy <= GAME.accuracyIdeal[1]) return "good";
  if (accuracy < 20 || accuracy > 85) return "very-poor";
  if (accuracy < 35 || accuracy > 72) return "poor";
  return "ok";
}

function isGoodPower(power) {
  return classifyPower(power) === "good";
}

function isGoodAccuracy(accuracy) {
  return classifyAccuracy(accuracy) === "good";
}

function specialCodeFor(direction, power, accuracy, rng = Math.random) {
  const powerState = classifyPower(power);
  const accuracyState = classifyAccuracy(accuracy);
  const poorPower = powerState === "poor" || powerState === "very-poor";
  const goodAccuracy = accuracyState === "good" || accuracyState === "ok";
  const poorAccuracy = accuracyState === "poor" || accuracyState === "very-poor";

  if (!poorPower) return null;

  const strongChance = powerState === "very-poor" || accuracyState === "very-poor" ? 0.85 : 0.6;
  const mediumChance = powerState === "very-poor" ? 0.7 : 0.45;

  if (poorPower && goodAccuracy && rng() < mediumChance) {
    if (direction.col === 0 || direction.col === 2) return `${direction.id}P`;
    return direction.row === 0 ? "LX" : direction.row === 1 ? "CX" : "RX";
  }

  if (poorPower && poorAccuracy && rng() < strongChance) {
    if (direction.row === 0) return direction.col === 0 ? "LO" : direction.col === 1 ? "CO" : "RO";
    if (direction.col === 0 || direction.col === 2) return `${direction.id}W`;
  }

  return null;
}

function driftDirection(direction, power, accuracy, rng = Math.random) {
  if (isGoodPower(power) && isGoodAccuracy(accuracy)) return direction;
  let chance = 0.15;
  if (classifyAccuracy(accuracy) === "poor") chance = 0.35;
  if (classifyAccuracy(accuracy) === "very-poor") chance = 0.55;
  if (rng() > chance) return direction;

  const colDrift = classifyAccuracy(accuracy) === "good" ? 0 : rng() < 0.5 ? -1 : 1;
  const rowDrift = power < 35 ? 1 : power > 65 ? -1 : 0;
  return findDirection(clamp(direction.row + rowDrift, 0, 2), clamp(direction.col + colDrift, 0, 2), direction);
}

function keeperBoostChance(finalDirection, power, accuracy) {
  if (isGoodPower(power) && isGoodAccuracy(accuracy)) return 0;
  let boost = 0;
  if (classifyPower(power) === "poor") boost += 0.12;
  if (classifyPower(power) === "very-poor") boost += 0.25;
  if (classifyAccuracy(accuracy) === "poor") boost += 0.12;
  if (classifyAccuracy(accuracy) === "very-poor") boost += 0.25;
  if (finalDirection.col === 1) boost += 0.12;
  if (finalDirection.col === 1 && finalDirection.row === 1) boost += 0.18;
  return Math.min(boost, 0.7);
}

function commentaryFor(code, goal) {
  if (goal) return COMMENTARY.goal;
  if (code.endsWith("P")) return COMMENTARY.post;
  if (["LX", "CX", "RX"].includes(code)) return COMMENTARY.bar;
  if (["LO", "CO", "RO"].includes(code)) return COMMENTARY.over;
  if (code.endsWith("W")) return COMMENTARY.wide;
  return COMMENTARY.save;
}

function resolvePenalty({ direction, power, accuracy, keeperDirection, rng = Math.random }) {
  const special = specialCodeFor(direction, power, accuracy, rng);
  if (special) {
    return {
      chosenDirection: direction,
      finalDirection: direction,
      keeperDirection,
      power,
      accuracy,
      code: special,
      targetPoint: pointForOutcome(special, direction),
      result: "S",
      goal: false,
      commentary: commentaryFor(special, false),
    };
  }

  const finalDirection = driftDirection(direction, power, accuracy, rng);
  const boostedSave = rng() < keeperBoostChance(finalDirection, power, accuracy);
  const effectiveKeeper = boostedSave ? finalDirection : keeperDirection;
  const saved = effectiveKeeper.id === finalDirection.id;
  const goal = !saved;

  return {
    chosenDirection: direction,
    finalDirection,
    keeperDirection: effectiveKeeper,
    power,
    accuracy,
    code: finalDirection.id,
    targetPoint: pointForDirection(finalDirection),
    result: goal ? "G" : "S",
    goal,
    commentary: commentaryFor(finalDirection.id, goal),
  };
}

function aiMeterValue() {
  return 20 + Math.floor(Math.random() * 81);
}

function useMeter(active) {
  const [value, setValue] = useState(0);
  const [up, setUp] = useState(true);

  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => {
      setValue((current) => {
        if (current >= 100) {
          setUp(false);
          return 100 - GAME.meterStep;
        }
        if (current <= 0) {
          setUp(true);
          return GAME.meterStep;
        }
        return current + (up ? GAME.meterStep : -GAME.meterStep);
      });
    }, GAME.meterTickMs);
    return () => window.clearInterval(id);
  }, [active, up]);

  return useMemo(
    () => ({
      value,
      reset() {
        setValue(0);
        setUp(true);
      },
    }),
    [value]
  );
}

function playSound(src, volume = 0.85) {
  if (!src) return;
  const audio = new Audio(src);
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

function visiblePenaltyMarkers(attempts) {
  return attempts.length > GAME.regulationPens ? attempts.slice(GAME.regulationPens) : attempts;
}

function decideMatchState({ attempts, score, fixture }) {
  const userAttempts = attempts.user.length;
  const opponentAttempts = attempts.opponent.length;
  const equalAttempts = userAttempts === opponentAttempts;
  const afterRegulation = userAttempts >= GAME.regulationPens && opponentAttempts >= GAME.regulationPens;

  if (!afterRegulation || !equalAttempts) return { finished: false, draw: false, winnerSide: null };
  if (score.user > score.opponent) return { finished: true, draw: false, winnerSide: "user" };
  if (score.opponent > score.user) return { finished: true, draw: false, winnerSide: "opponent" };
  if (fixture?.requiresWinner) return { finished: false, draw: false, winnerSide: null };
  return { finished: true, draw: true, winnerSide: null };
}


function stageLabelForFixture(fixture) {
  const stage = fixture?.stage || "group";
  const labels = {
    group: "GROUP STAGE",
    round32: "ROUND OF 32",
    round16: "ROUND OF 16",
    quarterFinal: "QUARTER-FINAL",
    semiFinal: "SEMI-FINALS",
    thirdPlace: "3RD PLACE PLAY-OFF",
    final: "FINAL",
  };
  return labels[stage] || "MATCH";
}

function buildResult({ fixture, userTeam, opponentTeam, score, winnerSide, isDraw }) {
  const userIsHome = fixture?.homeTeamId === userTeam.id;
  const homeGoals = userIsHome ? score.user : score.opponent;
  const awayGoals = userIsHome ? score.opponent : score.user;
  const winner = isDraw ? null : winnerSide === "user" ? userTeam.id : opponentTeam.id;
  const loser = isDraw ? null : winnerSide === "user" ? opponentTeam.id : userTeam.id;

  return {
    fixtureId: fixture?.id ?? null,
    matchNo: fixture?.matchNo ?? null,
    stage: fixture?.stage ?? "group",
    homeTeam: fixture?.homeTeamId ?? (userIsHome ? userTeam.id : opponentTeam.id),
    awayTeam: fixture?.awayTeamId ?? (userIsHome ? opponentTeam.id : userTeam.id),
    homeGoals,
    awayGoals,
    winner,
    loser,
    userWon: winnerSide === "user",
    isDraw,
  };
}

function TeamFlag({ team, className = "h-4 w-6" }) {
  if (team.flag) return <img src={team.flag} alt={`${team.name} flag`} className={`${className} rounded-sm object-cover`} draggable={false} />;
  return <Flag team={team.name} className={className} />;
}

function PenaltyMarkers({ attempts }) {
  const visible = visiblePenaltyMarkers(attempts);
  return (
    <div className="flex w-full justify-center gap-1">
      {Array.from({ length: GAME.regulationPens }).map((_, idx) => {
        const value = visible[idx];
        const color = value === "G" ? "bg-green-500 pen-marker-goal" : value === "S" ? "bg-red-500 pen-marker-save" : "bg-[#F7D117] pen-marker-empty";
        return <span key={idx} className={`h-2 w-2 rounded-full ${color}`} />;
      })}
    </div>
  );
}

function Scoreboard({ userTeam, opponentTeam, score, attempts, ticker, tickerStyle, stageLabel }) {
  return (
    <section className="relative h-[16.5%] shrink-0 overflow-hidden bg-[#050505]">
      <div
        className="absolute inset-0 opacity-50"
        style={{ backgroundImage: "radial-gradient(circle, rgba(247,209,23,0.24) 1px, transparent 1.8px)", backgroundSize: "6px 6px" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
      <div className="absolute inset-x-0 bottom-[26%] h-px bg-[#F7D117]/16" />
      <div className="relative z-[1] h-full">
        <div className="led-text-glow grid h-[22%] place-items-center py-[2%] text-center font-sans text-[clamp(10px,1.6vh,20px)] font-black uppercase tracking-[0.14em] text-[#F7D117]">
          {stageLabel || "GROUP STAGE"}
        </div>
        <div className="h-[52%] px-[3.5%] pt-[1%]">
          <div className="grid h-full grid-cols-[12%_1fr_auto_1fr_12%] grid-rows-[58%_42%] items-center">
            <div className="col-start-1 row-start-1 flex items-center justify-center"><TeamFlag team={userTeam} className="h-4 w-6" /></div>
            <div className="col-start-2 row-start-1 flex items-center justify-center px-[2%]"><div className="led-text-glow w-full text-center font-sans text-[clamp(20px,3.8vh,42px)] font-black leading-none tracking-tight text-[#F7D117]">{userTeam.code}</div></div>
            <div className="led-text-glow col-start-3 row-start-1 flex items-center justify-center px-[4%] font-sans text-[clamp(24px,4vh,48px)] font-black leading-none tracking-tight text-[#F7D117]">{score.user}-{score.opponent}</div>
            <div className="col-start-4 row-start-1 flex items-center justify-center px-[2%]"><div className="led-text-glow w-full text-center font-sans text-[clamp(20px,3.8vh,42px)] font-black leading-none tracking-tight text-[#F7D117]">{opponentTeam.code}</div></div>
            <div className="col-start-5 row-start-1 flex items-center justify-center"><TeamFlag team={opponentTeam} className="h-4 w-6" /></div>
            <div className="col-start-2 row-start-2 flex justify-center pt-[2%]"><div className="w-[4.4em]"><PenaltyMarkers attempts={attempts.user} /></div></div>
            <div className="col-start-4 row-start-2 flex justify-center pt-[2%]"><div className="w-[4.4em]"><PenaltyMarkers attempts={attempts.opponent} /></div></div>
          </div>
        </div>
        <div className="grid h-[26%] w-full place-items-center overflow-hidden px-[3%] text-center font-sans text-[clamp(13px,2.3vh,28px)] font-black tracking-tight" style={tickerStyle}>
          {ticker}
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
    <div className="pointer-events-none absolute inset-x-[0.5%] z-[2] overflow-hidden border-t border-[#2d2d2d] bg-[#050505] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]" style={{ top: `${goalLine - boardHeight}%`, height: `${boardHeight}%` }}>
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
      <div className="absolute inset-0 opacity-45" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent 7%, rgba(245,241,232,0.22) 7.4%, transparent 7.8%), repeating-linear-gradient(180deg, transparent 0%, transparent 11%, rgba(245,241,232,0.18) 11.5%, transparent 12%)" }} />
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
      <div className="pointer-events-none absolute left-1/2 z-[3] h-[22%] w-[88%] -translate-x-1/2 rounded-b-full border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
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
    <button onClick={onClick} disabled={disabled} className="grid h-[clamp(40px,4.7vh,62px)] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] bg-[#F7D117] px-4 text-center text-[clamp(11px,1.6vh,19px)] font-black leading-none text-[#0b2d1d] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22)] disabled:opacity-50">
      <span className="block w-full whitespace-nowrap text-center">{children}</span>
    </button>
  );
}

function ControlOverlay({ phase, selected, setSelected, handleConfirm, powerMeter, accuracyMeter, opponentTeam }) {
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
        <div className="pointer-events-auto absolute inset-x-[6%] bottom-[4%]"><ConfirmButton disabled>{phase === PHASE.SHOT ? "SHOT IN PROGRESS" : phase === PHASE.AI_WAIT ? `${opponentTeam.name.toUpperCase()} TAKING PENALTY` : "MATCH COMPLETE"}</ConfirmButton></div>
      )}
    </section>
  );
}

export default function FootballGame({ userTeam, opponentTeam, fixture, assets = {}, onMatchComplete, completedResult = null }) {
  const user = useMemo(() => normaliseTeam(userTeam, "Team A"), [userTeam]);
  const opponent = useMemo(() => normaliseTeam(opponentTeam, "Team B"), [opponentTeam]);
  const mergedAssets = useMemo(() => ({ ...DEFAULT_ASSETS, ...assets, sounds: { ...DEFAULT_ASSETS.sounds, ...(assets?.sounds || {}) } }), [assets]);
  const stageLabel = stageLabelForFixture(fixture);

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

  const powerMeter = useMeter(phase === PHASE.POWER);
  const accuracyMeter = useMeter(phase === PHASE.ACCURACY);
  const activeTeam = shootingSide === "user" ? user : opponent;
  const defenderTeam = shootingSide === "user" ? opponent : user;
  const shotActive = phase === PHASE.SHOT && Boolean(shot);
  const ballPoint = shot?.targetPoint ?? GAME.spot;
  const keeperPoint = shot ? pointForDirection(shot.keeperDirection) : pointForDirection(getDirection("CM"));
  const aimDirection = lockedDirection ?? selected;
  const showAim = phase === PHASE.DIRECTION || phase === PHASE.POWER || phase === PHASE.ACCURACY;

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
      setAttempts({ user: [], opponent: [] });
      setShot(null);
      setWinnerSide(completedResult.won ? "user" : "opponent");
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
      const result = buildResult({ fixture, userTeam: user, opponentTeam: opponent, score: nextScore, winnerSide: matchState.winnerSide, isDraw: matchState.draw });
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
      window.setTimeout(() => commitShot("opponent", randomDirection(), aiMeterValue(), aiMeterValue(), nextScore, nextAttempts), GAME.aiWaitMs);
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
    window.setTimeout(() => finishTurn(nextAttempts, nextScore, side), GAME.shotMs);
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
    if (phase === PHASE.FINISHED && !finalTeam) return { background: "#F7D117", color: "#0b2d1d" };
    if (ticker === COMMENTARY.goal) return { background: activeTeam.primaryColour, color: activeTeam.textColour, animation: "goalFlash 0.82s steps(1, end) 1 forwards", "--goal-bg": activeTeam.primaryColour, "--goal-fg": activeTeam.textColour };
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
        @keyframes goalFlash {
          0%, 19.9% { background: var(--goal-bg); color: var(--goal-fg); }
          20%, 39.9% { background: var(--goal-fg); color: var(--goal-bg); }
          40%, 59.9% { background: var(--goal-bg); color: var(--goal-fg); }
          60%, 79.9% { background: var(--goal-fg); color: var(--goal-bg); }
          80%, 100% { background: var(--goal-bg); color: var(--goal-fg); }
        }
      `}</style>
      <Scoreboard userTeam={user} opponentTeam={opponent} score={score} attempts={attempts} ticker={ticker} tickerStyle={tickerStyle()} stageLabel={stageLabel} />
      <Pitch ballPoint={ballPoint} keeperPoint={keeperPoint} shot={shot} shotActive={shotActive} activeTeam={activeTeam} defenderTeam={defenderTeam} showAim={showAim} aimDirection={aimDirection} assets={mergedAssets} />
      <ControlOverlay phase={phase} selected={selected} setSelected={setSelected} handleConfirm={handleConfirm} powerMeter={powerMeter} accuracyMeter={accuracyMeter} opponentTeam={opponent} />
    </div>
  );
}
