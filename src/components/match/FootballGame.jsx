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
import SharedCrowdBackdrop from "../crowd/SharedCrowdBackdrop.jsx";
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

import { ControlOverlay, Pitch, TemporaryMatchButtons } from "./FootballGameView.jsx";
export { MatchPitchPreview } from "./FootballGameView.jsx";

export default function FootballGame({ userTeam, opponentTeam, fixture, assets = {}, onMatchComplete, completedResult = null, endActionLabel = "MATCH COMPLETE", endActionEnabled = false, onEndAction, showChampionsBadge = false, podiumBadgeMode = null, activeCosmetics: activeCosmeticsProp = null, username = "" }) {
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
      const completedAttempts = completedResult.attempts || {};
      setAttempts({
        user: Array.isArray(completedAttempts.user) ? completedAttempts.user : [],
        opponent: Array.isArray(completedAttempts.opponent) ? completedAttempts.opponent : [],
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
      <Scoreboard userTeam={user} opponentTeam={opponent} score={score} attempts={attempts} ticker={ticker} tickerStyle={tickerStyle()} stageLabel={stageLabel} totalMarkerSlots={suddenDeathMarkerSlots} username={username} usernameEnabled={Boolean(username)} />
      {/* Launch build: temporary result/debug buttons hidden. */}
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
