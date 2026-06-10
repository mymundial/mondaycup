import { GROUPS } from "../../data/teams.js";

export const EXPORT_STATES = [
  { id: "match", label: "MATCH" },
  { id: "poster", label: "POSTER" },
  { id: "shirt", label: "SHIRT" },
];

export const TEAM_OPTIONS = Object.values(GROUPS).flat().sort((a, b) => a.localeCompare(b));
export const CROWD_OPTIONS = [
  { value: "GROUP STAGE", label: "GROUP" },
  { value: "ROUND OF 16", label: "KNOCKOUT" },
  { value: "FINAL", label: "FINAL" },
];
export const FLASH_BG_OPTIONS = [
  { value: "teamA", label: "TEAM A" },
  { value: "teamB", label: "TEAM B" },
  { value: "yellow", label: "YELLOW" },
  { value: "dark", label: "DARK" },
  { value: "custom", label: "CUSTOM" },
];
export const BG_OPTIONS = [
  { value: "pitch", label: "PITCH" },
  { value: "team", label: "TEAM" },
  { value: "custom", label: "CUSTOM" },
];
export const FONT_OPTIONS = [
  { value: "led", label: "LED" },
  { value: "bold", label: "BOLD" },
  { value: "regular", label: "REG" },
  { value: "light", label: "LIGHT" },
];
export const FONT_WEIGHT_OPTIONS = [
  { value: "700", label: "BOLD" },
  { value: "900", label: "HEAVY" },
  { value: "400", label: "REG" },
];
export const FONT_STYLE_OPTIONS = [
  { value: "normal", label: "NORMAL" },
  { value: "italic", label: "ITALIC" },
];
export const BADGE_OPTIONS = [
  { value: "none", label: "NONE" },
  { value: "monday", label: "MONDAY" },
  { value: "champion", label: "CHAMPION" },
  { value: "runnerUp", label: "RUNNER-UP" },
  { value: "third", label: "THIRD" },
];
export const SD_OPTIONS = [0, 1, 2, 3];
export const SCORE_DISPLAY_OPTIONS = [
  { value: "score", label: "SCORE" },
  { value: "vs", label: "VS" },
];
export const LED_YELLOW = "#F7D117";
export const IVORY = "#F5F1E8";
export const DARK_GREEN = "#072D1D";
export const SHIRT_DEFAULT_BG = "#073B26";
export const SHIRT_DEFAULT_COMPOSITION = {
  mondayScale: 1.18,
  mondayX: 0,
  mondayY: 0,
  nameScale: 1.18,
  nameX: 0,
  nameY: 0,
  numberScale: 1.58,
  numberX: 0,
  numberY: 0,
  brothersScale: 0.65,
  brothersX: 0,
  brothersY: 0,
};
export const SHIRT_COMPOSITION_STORAGE_KEY = "mondayCup.share.shirtComposition";
export const SHARE_PREVIEW_CLASS = "w-[min(400px,calc(100vw-32px))] max-w-[400px]";
export const PITCH_MOW_BACKGROUND_IMAGE = [
  "linear-gradient(90deg, #0f7444 0% 11.111%, #0b5f35 11.111% 22.222%, #0f7444 22.222% 33.333%, #0b5f35 33.333% 44.444%, #0f7444 44.444% 55.555%, #0b5f35 55.555% 66.666%, #0f7444 66.666% 77.777%, #0b5f35 77.777% 88.888%, #0f7444 88.888% 100%)",
  "radial-gradient(circle at 50% 0%, rgba(247,209,23,0.045), transparent 34%)",
  "linear-gradient(180deg, rgba(245,241,232,0.018) 0%, rgba(5,26,17,0.10) 100%)",
].join(", ");
export const PITCH_MOW_BACKGROUND_STYLE = {
  backgroundColor: "#0d6c3d",
  backgroundImage: PITCH_MOW_BACKGROUND_IMAGE,
  backgroundSize: "100% 100%, 100% 100%, 100% 100%",
  backgroundRepeat: "no-repeat",
};
export const DIRECTION_TO_SLOT = { LT: "1", CT: "2", RT: "3", LM: "4", CM: "5", RM: "6", LB: "7", CB: "8", RB: "9" };
