export const DEFAULT_ASSETS = {
  logo: "https://raw.githubusercontent.com/mymundial/mymundial/ad679ee2973445fc1c1c856603f6baf5695d90c6/LOGO-wht.png",
  ball: "/ball1.png",
  goalkeeper: "/gk1.png",
  sounds: {
    userShot: "https://raw.githubusercontent.com/mymundial/mymundial/415282fcde8c537de643f76e83d168f413ee6735/shot2mon.wav",
    opponentShot: "https://raw.githubusercontent.com/mymundial/mymundial/415282fcde8c537de643f76e83d168f413ee6735/Shot5.wav",
  },
};

export const LED_YELLOW = "#F7D117";

export const GAME = {
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

export const DIRECTIONS = [
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

export const PHASE = {
  DIRECTION: "direction",
  POWER: "power",
  ACCURACY: "accuracy",
  SHOT: "shot",
  AI_WAIT: "ai-wait",
  FINISHED: "finished",
};

export const COMMENTARY = {
  goal: "GOAL!",
  save: "SAVE!",
  wide: "WIDE!",
  over: "OVER!",
  post: "HIT THE POST!",
  bar: "HIT THE CROSSBAR!",
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const getDirection = (id) => DIRECTIONS.find((direction) => direction.id === id) ?? DIRECTIONS[4];
export const randomDirection = () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
export const findDirection = (row, col, fallback) => DIRECTIONS.find((direction) => direction.row === row && direction.col === col) ?? fallback;

export function normaliseTeam(team, fallback) {
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

export function pointForDirection(direction) {
  const goal = GAME.goal;
  return {
    x: goal.left + goal.width * ((direction.col + 0.5) / 3),
    y: goal.top + goal.height * ((direction.row + 0.5) / 3),
  };
}

export function pointForOutcome(outcome, direction) {
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

export function directionVector(direction) {
  return { x: direction.col - 1, y: direction.row - 1 };
}

export function keeperTransform(direction, active) {
  const vector = directionVector(direction);
  const rotation = vector.x === 0 ? 0 : vector.x > 0 ? 18 : -18;
  const scale = active ? 1.08 : 1;
  const lift = active && vector.y !== 0 ? -1 : 0;
  return `translate(-50%, -50%) translateY(${lift}px) rotate(${rotation}deg) scale(${scale})`;
}

export function ballTransform(active) {
  return `translate(-50%, -50%) scale(${active ? 0.8 : 1}) rotate(${active ? 42 : 0}deg)`;
}

export function shotTravelMs(shot) {
  if (!shot) return 520;
  return Math.round(clamp(980 - shot.power * 3.4, 560, 860));
}

export function keeperTravelMs(shot) {
  if (!shot) return 420;
  return Math.round(clamp(620 - shot.power * 1.2, 430, 620));
}

export function classifyPower(power) {
  if (power >= GAME.powerIdeal[0] && power <= GAME.powerIdeal[1]) return "good";
  if (power < 25 || power > 78) return "very-poor";
  if (power < 35 || power > 65) return "poor";
  return "ok";
}

export function classifyAccuracy(accuracy) {
  if (accuracy >= GAME.accuracyIdeal[0] && accuracy <= GAME.accuracyIdeal[1]) return "good";
  if (accuracy < 20 || accuracy > 85) return "very-poor";
  if (accuracy < 35 || accuracy > 72) return "poor";
  return "ok";
}

export function isGoodPower(power) {
  return classifyPower(power) === "good";
}

export function isGoodAccuracy(accuracy) {
  return classifyAccuracy(accuracy) === "good";
}

export function specialCodeFor(direction, power, accuracy, rng = Math.random) {
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

export function driftDirection(direction, power, accuracy, rng = Math.random) {
  if (isGoodPower(power) && isGoodAccuracy(accuracy)) return direction;
  let chance = 0.15;
  if (classifyAccuracy(accuracy) === "poor") chance = 0.35;
  if (classifyAccuracy(accuracy) === "very-poor") chance = 0.55;
  if (rng() > chance) return direction;

  const colDrift = classifyAccuracy(accuracy) === "good" ? 0 : rng() < 0.5 ? -1 : 1;
  const rowDrift = power < 35 ? 1 : power > 65 ? -1 : 0;
  return findDirection(clamp(direction.row + rowDrift, 0, 2), clamp(direction.col + colDrift, 0, 2), direction);
}

export function keeperBoostChance(finalDirection, power, accuracy) {
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

export function commentaryFor(code, goal) {
  if (goal) return COMMENTARY.goal;
  if (code.endsWith("P")) return COMMENTARY.post;
  if (["LX", "CX", "RX"].includes(code)) return COMMENTARY.bar;
  if (["LO", "CO", "RO"].includes(code)) return COMMENTARY.over;
  if (code.endsWith("W")) return COMMENTARY.wide;
  return COMMENTARY.save;
}

export function resolvePenalty({ direction, power, accuracy, keeperDirection, rng = Math.random }) {
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

export function aiMeterValue() {
  return 20 + Math.floor(Math.random() * 81);
}

export function playSound(src, volume = 0.85) {
  if (!src) return;
  const audio = new Audio(src);
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

export function visiblePenaltyMarkers(attempts) {
  return attempts;
}

export function decideMatchState({ attempts, score, fixture }) {
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


export function stageLabelForFixture(fixture) {
  const stage = fixture?.stage || "group";
  const labels = {
    group: "GROUP STAGE",
    round32: "ROUND OF 32",
    round16: "ROUND OF 16",
    quarterFinal: "QUARTER-FINAL",
    semiFinal: "SEMI-FINAL",
    thirdPlace: "3RD PLACE PLAY-OFF",
    final: "FINAL",
  };
  return labels[stage] || "MATCH";
}

export function buildResult({ fixture, userTeam, opponentTeam, score, winnerSide, isDraw }) {
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
