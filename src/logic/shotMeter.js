import { clamp } from "./penaltyEngine.js";

export const PHASE_ACCURACY = "accuracy";
export const POWER_SWEEP_MS = 1300;
export const DEFAULT_ACCURACY_SWEEP_MS = 1125;
export const POWER_TARGET_ZONE = [40, 60];
export const ACCURACY_TARGET_ZONE = [40, 60];
export const UPGRADED_POWER_TARGET_ZONE = [35, 65];
export const UPGRADED_ACCURACY_TARGET_ZONE = [35, 65];
export const USER_KEEPER_READ_CHANCE = Object.freeze({
  perfect: 0.10,
  excellent: 0.14,
  good: 0.20,
  edge: 0.28,
});


export const ROOKIE_ACCURACY_ASSIST = Object.freeze({
  debutant: { targetMultiplier: 1.45, sweepMultiplier: 1.15 },
  excitingProspect: { targetMultiplier: 1.25, sweepMultiplier: 1.08 },
  establishedPro: { targetMultiplier: 1, sweepMultiplier: 1 },
});

export const COSMETIC_ZONE_CONFIG = Object.freeze({
  goldenBoot: {
    baseZone: POWER_TARGET_ZONE,
    upgradedZone: UPGRADED_POWER_TARGET_ZONE,
  },
  goldenBall: {
    baseZone: ACCURACY_TARGET_ZONE,
    upgradedZone: UPGRADED_ACCURACY_TARGET_ZONE,
  },
});

export function hasCosmetic(activeCosmetics, key) {
  return Boolean(activeCosmetics?.[key]);
}

export function getPowerTargetZone(activeCosmetics = {}, playerCareerStars = null) {
  const baseZone = hasCosmetic(activeCosmetics, "goldenBoot") ? UPGRADED_POWER_TARGET_ZONE : POWER_TARGET_ZONE;
  const assist = getCareerAccuracyAssist(playerCareerStars);
  return expandTargetZone(baseZone, assist.targetMultiplier);
}

export function getCareerAccuracyAssist(playerCareerStars = null) {
  if (playerCareerStars === null || playerCareerStars === undefined) {
    return ROOKIE_ACCURACY_ASSIST.establishedPro;
  }

  const stars = Number(playerCareerStars);
  if (!Number.isFinite(stars)) return ROOKIE_ACCURACY_ASSIST.establishedPro;
  if (stars <= 0) return ROOKIE_ACCURACY_ASSIST.debutant;
  if (stars === 1) return ROOKIE_ACCURACY_ASSIST.excitingProspect;
  return ROOKIE_ACCURACY_ASSIST.establishedPro;
}

function expandTargetZone(targetZone, multiplier = 1) {
  const [targetMin, targetMax] = targetZone;
  const safeMultiplier = Math.max(1, Number(multiplier) || 1);
  if (safeMultiplier <= 1) return targetZone;

  const centre = (targetMin + targetMax) / 2;
  const halfWidth = ((targetMax - targetMin) * safeMultiplier) / 2;
  return [clamp(centre - halfWidth, 0, 100), clamp(centre + halfWidth, 0, 100)];
}

export function getAccuracyTargetZone(activeCosmetics = {}, playerCareerStars = null) {
  const baseZone = hasCosmetic(activeCosmetics, "goldenBall") ? UPGRADED_ACCURACY_TARGET_ZONE : ACCURACY_TARGET_ZONE;
  const assist = getCareerAccuracyAssist(playerCareerStars);
  return expandTargetZone(baseZone, assist.targetMultiplier);
}

function expandedBand(value, targetZone, woodworkMargin = 10) {
  // Always judge the displayed/snap value, not a fractional animation value.
  // This keeps Golden Boot/Golden Ball visual zone extensions perfectly aligned
  // with the actual gameplay parameters on mobile and desktop.
  const displayed = displayedMeterValue(value);
  const [targetMin, targetMax] = targetZone;
  const woodworkMin = Math.max(0, targetMin - woodworkMargin);
  const woodworkMax = Math.min(100, targetMax + woodworkMargin);

  if (displayed >= targetMin && displayed <= targetMax) return "target";
  if ((displayed >= woodworkMin && displayed < targetMin) || (displayed > targetMax && displayed <= woodworkMax)) {
    return "woodwork";
  }
  return "miss";
}

export function accuracySpeedForPower(power, activeCosmetics = {}, playerCareerStars = null) {
  const safe = displayedMeterValue(power);
  const [targetMin, targetMax] = getPowerTargetZone(activeCosmetics, playerCareerStars);
  const nearMin = Math.max(0, targetMin - 10);
  const nearMax = Math.min(100, targetMax + 10);
  const assist = getCareerAccuracyAssist(playerCareerStars);

  let sweepMs;

  // Best power = easiest, but still quick enough for rhythm/double-tap flow.
  if (safe >= targetMin && safe <= targetMax) sweepMs = 1125;

  // Near-good power = slightly faster.
  else if ((safe >= nearMin && safe < targetMin) || (safe > targetMax && safe <= nearMax)) {
    sweepMs = 1000;
  }

  // Poor power = fast.
  else if ((safe >= 10 && safe < nearMin) || (safe > nearMax && safe <= 90)) {
    sweepMs = 900;
  }

  // Extreme power = fastest.
  else sweepMs = 800;

  return Math.round(sweepMs * assist.sweepMultiplier);
}

export function displayedMeterValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return clamp(Math.round(clamp(numericValue, 0, 100)), 0, 100);
}

export function snapMeterValueForOutcome(value) {
  return displayedMeterValue(value);
}

export function accuracyBandForValue(value, activeCosmetics = {}, playerCareerStars = null) {
  // Judge the same value the user sees on screen. This keeps visual meter bands
  // and shot results in lockstep, especially around the 25/35/65/75 edges when
  // Golden Ball is equipped.
  return expandedBand(value, getAccuracyTargetZone(activeCosmetics, playerCareerStars), 10);
}

export function isAccuracyInTargetZone(value, activeCosmetics = {}, playerCareerStars = null) {
  return accuracyBandForValue(value, activeCosmetics, playerCareerStars) === "target";
}

export function isPowerInTargetZone(value, activeCosmetics = {}, playerCareerStars = null) {
  return expandedBand(value, getPowerTargetZone(activeCosmetics, playerCareerStars), 10) === "target";
}

export function accuracyOutcomeForValue(value, direction, activeCosmetics = {}, playerCareerStars = null) {
  const band = accuracyBandForValue(value, activeCosmetics, playerCareerStars);
  if (band === "target") return "onTarget";

  const col = Number(direction?.col);
  const isWoodwork = band === "woodwork";

  // Direction is locked. Accuracy only decides whether that chosen shot is
  // on target, hits the relevant post/bar, or misses on the same side.
  if (col === 0) return isWoodwork ? "postLeft" : "wideLeft";
  if (col === 2) return isWoodwork ? "postRight" : "wideRight";
  return isWoodwork ? "crossbarCentre" : "overCentre";
}

export function accuracyKeeperReadChanceForValue(value, activeCosmetics = {}, playerCareerStars = null) {
  // Reward the quality of on-target user accuracy without changing the visible
  // target zones. The closer the shot is to the centre of the meter, the less
  // often the keeper reads the correct square. Edge-of-target shots keep the
  // original 28% read chance.
  if (!isAccuracyInTargetZone(value, activeCosmetics, playerCareerStars)) {
    return USER_KEEPER_READ_CHANCE.edge;
  }

  const displayed = displayedMeterValue(value);
  const distanceFromCentre = Math.abs(displayed - 50);

  if (distanceFromCentre <= 2) return USER_KEEPER_READ_CHANCE.perfect;
  if (distanceFromCentre <= 5) return USER_KEEPER_READ_CHANCE.excellent;
  if (distanceFromCentre <= 10) return USER_KEEPER_READ_CHANCE.good;
  return USER_KEEPER_READ_CHANCE.edge;
}

export function meterPoints(value, maxPoints = 50) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const safeValue = clamp(numericValue, 0, 100);
  const distanceFromMiddle = Math.abs(safeValue - 50);
  return clamp(Math.round(maxPoints - distanceFromMiddle), 0, maxPoints);
}

export function directionLabel(direction) {
  if (!direction) return null;
  if (direction.id) return direction.id;
  if (direction.col === 0) return "LEFT";
  if (direction.col === 2) return "RIGHT";
  return "CENTRE";
}
