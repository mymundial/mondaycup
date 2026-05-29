import { clamp } from "./penaltyEngine.js";

export const PHASE_ACCURACY = "accuracy";
export const POWER_SWEEP_MS = 1300;
export const DEFAULT_ACCURACY_SWEEP_MS = 1125;
export const POWER_TARGET_ZONE = [40, 60];
export const ACCURACY_TARGET_ZONE = [40, 60];
export const UPGRADED_POWER_TARGET_ZONE = [35, 65];
export const UPGRADED_ACCURACY_TARGET_ZONE = [35, 65];

export function hasCosmetic(activeCosmetics, key) {
  return Boolean(activeCosmetics?.[key]);
}

export function getPowerTargetZone(activeCosmetics = {}) {
  return hasCosmetic(activeCosmetics, "goldenBoot") ? UPGRADED_POWER_TARGET_ZONE : POWER_TARGET_ZONE;
}

export function getAccuracyTargetZone(activeCosmetics = {}) {
  return hasCosmetic(activeCosmetics, "goldenBall") ? UPGRADED_ACCURACY_TARGET_ZONE : ACCURACY_TARGET_ZONE;
}

function expandedBand(value, targetZone, woodworkMargin = 10) {
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

export function accuracySpeedForPower(power, activeCosmetics = {}) {
  const safe = clamp(Number(power) || 0, 0, 100);
  const [targetMin, targetMax] = getPowerTargetZone(activeCosmetics);
  const nearMin = Math.max(0, targetMin - 10);
  const nearMax = Math.min(100, targetMax + 10);

  // Best power = easiest, but still quick enough for rhythm/double-tap flow.
  if (safe >= targetMin && safe <= targetMax) return 1125;

  // Near-good power = slightly faster.
  if ((safe >= nearMin && safe < targetMin) || (safe > targetMax && safe <= nearMax)) {
    return 1000;
  }

  // Poor power = fast.
  if ((safe >= 10 && safe < nearMin) || (safe > nearMax && safe <= 90)) {
    return 900;
  }

  // Extreme power = fastest.
  return 800;
}

export function displayedMeterValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return clamp(Math.round(clamp(numericValue, 0, 100)), 0, 100);
}

export function accuracyBandForValue(value, activeCosmetics = {}) {
  // Judge the same value the user sees on screen. This keeps visual meter bands
  // and shot results in lockstep, especially around the 25/35/65/75 edges when
  // Golden Ball is equipped.
  return expandedBand(value, getAccuracyTargetZone(activeCosmetics), 10);
}

export function isAccuracyInTargetZone(value, activeCosmetics = {}) {
  return accuracyBandForValue(value, activeCosmetics) === "target";
}

export function isPowerInTargetZone(value, activeCosmetics = {}) {
  return expandedBand(value, getPowerTargetZone(activeCosmetics), 10) === "target";
}

export function accuracyOutcomeForValue(value, direction, activeCosmetics = {}) {
  const band = accuracyBandForValue(value, activeCosmetics);
  if (band === "target") return "onTarget";

  const col = Number(direction?.col);
  const isWoodwork = band === "woodwork";

  // Direction is locked. Accuracy only decides whether that chosen shot is
  // on target, hits the relevant post/bar, or misses on the same side.
  if (col === 0) return isWoodwork ? "postLeft" : "wideLeft";
  if (col === 2) return isWoodwork ? "postRight" : "wideRight";
  return isWoodwork ? "crossbarCentre" : "overCentre";
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
