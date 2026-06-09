import { ASSETS } from "../data/assets.js";
import { PODIUM_BADGE_MODE } from "./resultStatus.js";

const CHAMPIONS_BADGE_SRC = ASSETS.badges.champion;
const RUNNER_UP_BADGE_SRC = ASSETS.badges.runnerUp;
const THIRD_PLACE_BADGE_SRC = ASSETS.badges.third;
const MONDAY_CUP_SHIELD_SRC = ASSETS.branding.mondayLogo;

export function normaliseThirdPlaceCopy(value) {
  return String(value || "")
    .replace(/3rd\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF")
    .replace(/third\s*place\s*playoff/gi, "THIRD PLACE PLAY-OFF")
    .replace(/third\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF");
}

export function getPodiumBadgeVisuals(mode, options = {}) {
  const useShieldBadge = Boolean(options.useShieldBadge);
  const shieldBadgeVisuals = {
    src: MONDAY_CUP_SHIELD_SRC,
    alt: "Monday Cup",
    glowOuter: "rgba(247,209,23,0.28)",
    glowInner: "rgba(245,241,232,0.24)",
    shadow: "drop-shadow(0 10px 24px rgba(0,0,0,0.44))",
    pitchScale: 0.43,
  };

  if (useShieldBadge && (mode === PODIUM_BADGE_MODE.CHAMPION || mode === PODIUM_BADGE_MODE.RUNNER_UP)) {
    return shieldBadgeVisuals;
  }

  if (mode === PODIUM_BADGE_MODE.RUNNER_UP) {
    return {
      src: RUNNER_UP_BADGE_SRC,
      alt: "Monday Cup Runner-Up",
      glowOuter: "rgba(235,238,243,0.26)",
      glowInner: "rgba(255,255,255,0.22)",
      shadow: "drop-shadow(0 0 18px rgba(235,238,243,0.42))",
      pitchScale: 0.43,
    };
  }
  if (mode === PODIUM_BADGE_MODE.THIRD) {
    return {
      src: THIRD_PLACE_BADGE_SRC,
      alt: "Monday Cup Third Place",
      glowOuter: "rgba(205,127,50,0.26)",
      glowInner: "rgba(244,176,104,0.22)",
      shadow: "drop-shadow(0 0 18px rgba(205,127,50,0.42))",
      pitchScale: 0.43,
    };
  }
  if (mode === PODIUM_BADGE_MODE.CHAMPION) {
    return {
      src: CHAMPIONS_BADGE_SRC,
      alt: "Monday Cup Champions",
      glowOuter: "rgba(247,209,23,0.26)",
      glowInner: "rgba(255,213,74,0.26)",
      shadow: "drop-shadow(0 0 18px rgba(247,209,23,0.46))",
      pitchScale: 0.43,
    };
  }
  return null;
}
