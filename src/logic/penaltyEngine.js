import { ASSETS } from "../data/assets.js";
import { MC_SELECTION_LAYOUT } from "../styles/theme.js";

export const DEFAULT_ASSETS = {
  logo: ASSETS.branding.mondayCupAd,
  ball: ASSETS.game.ball,
  goalkeeper: ASSETS.game.goalkeeper,
  sounds: ASSETS.sounds,
};

export const LED_YELLOW = "#F7D117";

export const GAME = {
  regulationPens: 5,
  meterStep: 4,
  meterTickMs: 24,
  powerIdeal: [45, 55],
  // The new shooting loop is 2-step: choose direction, then hold/release power.
  // Accuracy is now derived from release quality and keeper square matching.
  shotMs: 950,
  aiWaitMs: 500,
  powerChargeMs: 1350,
  goal: {
    left: MC_SELECTION_LAYOUT.goalLeftPercent,
    top: MC_SELECTION_LAYOUT.goalTopPercent,
    width: MC_SELECTION_LAYOUT.goalWidthPercent,
    height: MC_SELECTION_LAYOUT.goalHeightPercent,
  },
  spot: {
    x: MC_SELECTION_LAYOUT.penaltySpotXPercent,
    y: MC_SELECTION_LAYOUT.penaltySpotYPercent,
  },
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
  SHOT: "shot",
  AI_WAIT: "ai-wait",
  FINISHED: "finished",
};

export const COMMENTARY = {
  goal: "GOAL!",
  save: "SAVED!",
  weak: "SAVED!",
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
    rank: Number(team?.rank ?? team?.ranking ?? team?.teamRank ?? team?.seed ?? team?.worldRank ?? 24),
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
  if (power < 25) return "very-weak";
  if (power < 40) return "weak";
  if (power >= GAME.powerIdeal[0] && power <= GAME.powerIdeal[1]) return "perfect";
  if (power >= 40 && power <= 60) return "good";
  if (power <= 75) return "overhit";
  return "very-overhit";
}

export function isGoodPower(power) {
  const state = classifyPower(power);
  return state === "perfect" || state === "good";
}

export function isWeakPower(power) {
  const state = classifyPower(power);
  return state === "weak" || state === "very-weak";
}

export function isOverhitPower(power) {
  const state = classifyPower(power);
  return state === "overhit" || state === "very-overhit";
}

export function keeperReadDirection(targetDirection, rng = Math.random, options = {}) {
  // MVP keeper AI: fair, visual and deterministic once the square is chosen.
  // goalAssist lowers the keeper read chance for temporary Golden Ball testing.
  const goalAssist = clamp(Number(options.goalAssist || 0), 0, 0.25);
  const readChance = clamp(0.28 - goalAssist, 0.05, 0.9);
  if (rng() < readChance) return targetDirection;
  return randomDifferentDirection(targetDirection, rng);
}


export function applyGoldenGloveSecondRead({ targetDirection, firstKeeperDirection, rng = Math.random }) {
  if (!targetDirection || !firstKeeperDirection) return firstKeeperDirection || targetDirection;
  if (firstKeeperDirection.id === targetDirection.id) return firstKeeperDirection;

  // Golden Glove removes the first wrong 1/9 read and gives the keeper one
  // second read from the remaining 8 goal segments.
  const remaining = DIRECTIONS.filter((candidate) => candidate.id !== firstKeeperDirection.id);
  return remaining[Math.floor(rng() * remaining.length)] || firstKeeperDirection;
}

export function getTeamRank(team) {
  const rawRank = team?.rank ?? team?.ranking ?? team?.teamRank ?? team?.seed ?? team?.worldRank;
  const rank = Number(rawRank);
  return Number.isFinite(rank) ? clamp(Math.round(rank), 1, 48) : 24;
}

export function getAiGoalProbability(team) {
  const rank = getTeamRank(team);
  if (rank <= 10) return 0.84;
  if (rank <= 20) return 0.74;
  if (rank <= 30) return 0.66;
  if (rank <= 39) return 0.58;
  return 0.50;
}

export function randomDifferentDirection(direction, rng = Math.random) {
  const alternatives = DIRECTIONS.filter((candidate) => candidate.id !== direction.id);
  return alternatives[Math.floor(rng() * alternatives.length)] ?? getDirection("CM");
}

function randomGoodPower(rank, rng) {
  // Better teams live closer to the optimum band, but every side can still hit a playable penalty.
  if (rank <= 10) return Math.round(46 + rng() * 8); // 46–54
  if (rank <= 20) return Math.round(43 + rng() * 14); // 43–57
  if (rank <= 30) return Math.round(41 + rng() * 18); // 41–59
  return Math.round(40 + rng() * 20); // 40–60
}

function randomWeakPower(rank, rng) {
  const base = rank <= 20 ? 28 : rank <= 30 ? 24 : 20;
  const span = rank <= 20 ? 11 : rank <= 30 ? 14 : 18;
  return Math.round(base + rng() * span);
}

function randomOverhitPower(rank, rng) {
  const base = rank <= 20 ? 76 : rank <= 30 ? 78 : 80;
  return Math.round(base + rng() * 15);
}

export function buildAiPenaltyAttempt({ team, direction, rng = Math.random }) {
  const rank = getTeamRank(team);
  const goalChance = getAiGoalProbability(team);
  const scores = rng() < goalChance;

  if (scores) {
    return {
      power: randomGoodPower(rank, rng),
      keeperDirection: randomDifferentDirection(direction, rng),
      expectedGoal: true,
    };
  }

  // Failed AI penalties should be visually clear: read by keeper, weak save, or obvious miss.
  const failureRoll = rng();
  const weakThreshold = rank <= 10 ? 0.20 : rank <= 20 ? 0.28 : rank <= 30 ? 0.36 : 0.44;
  const overhitThreshold = rank <= 10 ? 0.44 : rank <= 20 ? 0.54 : rank <= 30 ? 0.64 : 0.74;

  if (failureRoll < weakThreshold) {
    return {
      power: randomWeakPower(rank, rng),
      keeperDirection: direction,
      expectedGoal: false,
    };
  }

  if (failureRoll < overhitThreshold) {
    return {
      power: randomOverhitPower(rank, rng),
      keeperDirection: randomDifferentDirection(direction, rng),
      expectedGoal: false,
    };
  }

  return {
    power: randomGoodPower(rank, rng),
    keeperDirection: direction,
    expectedGoal: false,
  };
}

export function aiPowerValue(teamOrRng = null, maybeRng = Math.random) {
  // Backwards-compatible helper. Prefer buildAiPenaltyAttempt for AI-controlled shots.
  const rng = typeof teamOrRng === "function" ? teamOrRng : maybeRng;
  const team = typeof teamOrRng === "function" ? null : teamOrRng;
  return randomGoodPower(getTeamRank(team), rng);
}

export function missCodeFor(direction, power) {
  const powerState = classifyPower(power);

  if (powerState === "very-weak" || powerState === "weak") return direction.id;

  if (powerState === "very-overhit") {
    if (direction.row === 0 || direction.col === 1) {
      return direction.col === 0 ? "LO" : direction.col === 1 ? "CO" : "RO";
    }
    return direction.col === 0 ? `${direction.id}W` : direction.col === 2 ? `${direction.id}W` : "CO";
  }

  if (powerState === "overhit") {
    if (direction.row === 0) {
      if (power >= 65) return direction.col === 0 ? "LO" : direction.col === 1 ? "CO" : "RO";
      return direction.col === 0 ? "LX" : direction.col === 1 ? "CX" : "RX";
    }
    if (direction.row === 1 && direction.col !== 1 && power >= 70) return `${direction.id}W`;
    if (direction.row === 1 && direction.col === 1 && power >= 68) return "CX";
    if (direction.row === 2 && direction.col !== 1 && power >= 72) return `${direction.id}P`;
  }

  return direction.id;
}

export function commentaryFor(code, goal, quality = "") {
  if (goal) return COMMENTARY.goal;
  if (quality === "weak" || quality === "very-weak") return COMMENTARY.save;
  if (code.endsWith("P")) return COMMENTARY.post;
  if (["LX", "CX", "RX"].includes(code)) return COMMENTARY.bar;
  if (["LO", "CO", "RO"].includes(code)) return COMMENTARY.over;
  if (code.endsWith("W")) return COMMENTARY.wide;
  return COMMENTARY.save;
}

function missCodeForAccuracyOutcome(direction, accuracyOutcome) {
  const rowCode = direction.row === 0 ? "T" : direction.row === 1 ? "M" : "B";

  switch (accuracyOutcome) {
    case "postLeft":
      return `L${rowCode}P`;
    case "wideLeft":
      return `L${rowCode}W`;
    case "postRight":
      return `R${rowCode}P`;
    case "wideRight":
      return `R${rowCode}W`;
    case "crossbarCentre":
      return "CX";
    case "overCentre":
      return "CO";
    default:
      return direction.id;
  }
}

export function resolvePenalty({ direction, power, keeperDirection, rng = Math.random, middleBypass = false, accuracyOutcome = null }) {
  const powerState = classifyPower(power);

  // User-controlled 3-step shot logic:
  // 1) Direction is locked and never flips side.
  // 2) Power only controls accuracy-meter speed before this function is called.
  // 3) Accuracy decides on-target / post-bar / miss.
  // 4) If on target, keeper same square = save; keeper different square = goal.
  if (accuracyOutcome) {
    const resolvedKeeper = keeperDirection || keeperReadDirection(direction, rng);

    if (accuracyOutcome !== "onTarget") {
      const missCode = missCodeForAccuracyOutcome(direction, accuracyOutcome);
      return {
        chosenDirection: direction,
        finalDirection: direction,
        keeperDirection: resolvedKeeper,
        power,
        accuracy: null,
        quality: accuracyOutcome,
        code: missCode,
        targetPoint: pointForOutcome(missCode, direction),
        result: "S",
        goal: false,
        commentary: commentaryFor(missCode, false, accuracyOutcome),
      };
    }

    const saved = resolvedKeeper.id === direction.id;
    const goal = !saved;
    return {
      chosenDirection: direction,
      finalDirection: direction,
      keeperDirection: resolvedKeeper,
      power,
      accuracy: null,
      quality: "on-target",
      code: direction.id,
      targetPoint: pointForDirection(direction),
      result: goal ? "G" : "S",
      goal,
      commentary: commentaryFor(direction.id, goal, "on-target"),
    };
  }

  // Poor shots should not bamboozle the keeper. They become clear saves.
  if (powerState === "very-weak" || powerState === "weak") {
    const saveDirection = direction;
    return {
      chosenDirection: direction,
      finalDirection: direction,
      keeperDirection: saveDirection,
      power,
      accuracy: power,
      quality: powerState,
      code: direction.id,
      targetPoint: pointForDirection(direction),
      result: "S",
      goal: false,
      commentary: commentaryFor(direction.id, false, powerState),
    };
  }

  // Overhit shots fail visibly instead of relying on hidden probability.
  if (powerState === "overhit" || powerState === "very-overhit") {
    const missCode = missCodeFor(direction, power);
    const staysOnTarget = missCode === direction.id;
    if (!staysOnTarget) {
      return {
        chosenDirection: direction,
        finalDirection: direction,
        keeperDirection,
        power,
        accuracy: power,
        quality: powerState,
        code: missCode,
        targetPoint: pointForOutcome(missCode, direction),
        result: "S",
        goal: false,
        commentary: commentaryFor(missCode, false, powerState),
      };
    }
  }

  // Good/on-target shots obey the visual square rule:
  // keeper same square = save, keeper different square = goal.
  const resolvedKeeper = keeperDirection || keeperReadDirection(direction, rng);
  const middleBypassActive = Boolean(middleBypass) && direction.col === 1;
  const saved = !middleBypassActive && resolvedKeeper.id === direction.id;
  const goal = !saved;

  return {
    chosenDirection: direction,
    finalDirection: direction,
    keeperDirection: resolvedKeeper,
    power,
    accuracy: power,
    quality: powerState,
    code: direction.id,
    targetPoint: pointForDirection(direction),
    result: goal ? "G" : "S",
    goal,
    commentary: commentaryFor(direction.id, goal, powerState),
  };
}

// Backwards-compatible alias for older imports.
export const aiMeterValue = aiPowerValue;

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

export function buildResult({ fixture, userTeam, opponentTeam, score, winnerSide, isDraw, attempts = { user: [], opponent: [] } }) {
  const userIsHome = fixture?.homeTeamId === userTeam.id;
  const homeGoals = userIsHome ? score.user : score.opponent;
  const awayGoals = userIsHome ? score.opponent : score.user;
  const winner = isDraw ? null : winnerSide === "user" ? userTeam.id : opponentTeam.id;
  const loser = isDraw ? null : winnerSide === "user" ? opponentTeam.id : userTeam.id;
  const userWon = winnerSide === "user";
  const finalMatchOutcome = isDraw ? "draw" : userWon ? "win" : "loss";
  const enrichShotEvent = (event, index) => ({
    shotNumber: event?.shotNumber ?? index + 1,
    ...event,
    finalMatchOutcome,
    userWon,
    matchWon: userWon,
    matchDrawn: Boolean(isDraw),
  });
  const userShotEvents = Array.isArray(attempts?.user)
    ? attempts.user.map(enrichShotEvent)
    : [];
  const opponentShotEvents = Array.isArray(attempts?.opponent)
    ? attempts.opponent.map(enrichShotEvent)
    : [];
  const enrichedAttempts = {
    ...attempts,
    user: userShotEvents,
    opponent: opponentShotEvents,
  };

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
    userWon,
    isDraw,
    finalMatchOutcome,
    attempts: enrichedAttempts,
    userShotEvents,
    opponentShotEvents,
  };
}
