import { ASSETS } from "../data/assets.js";
import { PITCH_BADGE_MODE, PODIUM_BADGE_MODE } from "./resultStatus.js";

const CHAMPIONS_BADGE_SRC = ASSETS.badges.champion;
const RUNNER_UP_BADGE_SRC = ASSETS.badges.runnerUp;
const THIRD_PLACE_BADGE_SRC = ASSETS.badges.third;
const MONDAY_CUP_SHIELD_SRC = ASSETS.branding.mondayLogo;

export const SELECTION_PITCH_BADGE_GLOW = {
  glowOuter: "rgba(247,209,23,0.118125)",
  glowInner: "rgba(245,241,232,0.10125)",
  shadow: "drop-shadow(0 10px 24px rgba(0,0,0,0.33))",
};
export const MONDAY_CUP_SHIELD_PITCH_SCALE = 0.43;

export const PITCH_BADGE_OVERLAY_LAYOUT = Object.freeze({
  containerWidth: "99.825%",
  containerHeight: "74.415%",
  glowOuterTop: "54%",
  glowOuterWidth: "76%",
  glowOuterHeight: "56%",
  glowInnerTop: "54%",
  glowInnerWidth: "54%",
  glowInnerHeight: "38%",
});
const PODIUM_BADGE_PITCH_SCALE = MONDAY_CUP_SHIELD_PITCH_SCALE * 0.9;

export function normaliseThirdPlaceCopy(value) {
  return String(value || "")
    .replace(/3rd\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF")
    .replace(/third\s*place\s*playoff/gi, "THIRD PLACE PLAY-OFF")
    .replace(/third\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF");
}


export function getMondayCupShieldVisuals() {
  return {
    src: MONDAY_CUP_SHIELD_SRC,
    alt: "Monday Cup",
    ...SELECTION_PITCH_BADGE_GLOW,
    pitchScale: MONDAY_CUP_SHIELD_PITCH_SCALE,
  };
}

export function getPodiumBadgeVisuals(mode, options = {}) {
  const useShieldBadge = Boolean(options.useShieldBadge);
  const shieldBadgeVisuals = getMondayCupShieldVisuals();

  if (mode === PITCH_BADGE_MODE.MONDAY_CUP) {
    return shieldBadgeVisuals;
  }

  if (useShieldBadge && (mode === PODIUM_BADGE_MODE.CHAMPION || mode === PODIUM_BADGE_MODE.RUNNER_UP)) {
    return shieldBadgeVisuals;
  }

  if (mode === PODIUM_BADGE_MODE.RUNNER_UP) {
    return {
      src: RUNNER_UP_BADGE_SRC,
      alt: "Monday Cup Runner-Up",
      ...SELECTION_PITCH_BADGE_GLOW,
      pitchScale: PODIUM_BADGE_PITCH_SCALE,
    };
  }
  if (mode === PODIUM_BADGE_MODE.THIRD) {
    return {
      src: THIRD_PLACE_BADGE_SRC,
      alt: "Monday Cup Third Place",
      ...SELECTION_PITCH_BADGE_GLOW,
      pitchScale: PODIUM_BADGE_PITCH_SCALE,
    };
  }
  if (mode === PODIUM_BADGE_MODE.CHAMPION) {
    return {
      src: CHAMPIONS_BADGE_SRC,
      alt: "Monday Cup Champions",
      ...SELECTION_PITCH_BADGE_GLOW,
      pitchScale: PODIUM_BADGE_PITCH_SCALE,
    };
  }
  return null;
}
