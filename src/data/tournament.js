export const MATCHDAY_PAIRINGS = [
  { week: 1, pairings: [[0, 1], [2, 3]] },
  { week: 2, pairings: [[0, 2], [3, 1]] },
  { week: 3, pairings: [[3, 0], [1, 2]] },
];

// Round of 32 slots in the visual bracket order shown on the FIFA knockout bracket.
// Third-place labels mean: use the best available third-place team from one of those groups.
export const ROUND_OF_32_SLOTS = [
  { matchNo: 74, homeSeed: "1E", awaySeed: "3ABCDF" },
  { matchNo: 77, homeSeed: "1I", awaySeed: "3CDFGH" },
  { matchNo: 73, homeSeed: "2A", awaySeed: "2B" },
  { matchNo: 75, homeSeed: "1F", awaySeed: "2C" },
  { matchNo: 83, homeSeed: "2K", awaySeed: "2L" },
  { matchNo: 84, homeSeed: "1H", awaySeed: "2J" },
  { matchNo: 81, homeSeed: "1D", awaySeed: "3BEFIJ" },
  { matchNo: 82, homeSeed: "1G", awaySeed: "3AEHIJ" },
  { matchNo: 76, homeSeed: "1C", awaySeed: "2F" },
  { matchNo: 78, homeSeed: "2E", awaySeed: "2I" },
  { matchNo: 79, homeSeed: "1A", awaySeed: "3CEFHI" },
  { matchNo: 80, homeSeed: "1L", awaySeed: "3EHIJK" },
  { matchNo: 86, homeSeed: "1J", awaySeed: "2H" },
  { matchNo: 88, homeSeed: "2D", awaySeed: "2G" },
  { matchNo: 85, homeSeed: "1B", awaySeed: "3EFGIJ" },
  { matchNo: 87, homeSeed: "1K", awaySeed: "3DEIJL" },
];

// Placeholder paths for unpopulated knockout rounds after R32.
// These should be shown as fixture information until winners/runners-up are known.
export const KNOCKOUT_PLACEHOLDER_SLOTS = {
  "Round of 16": [
    { matchNo: 89, homeSeed: "W74", awaySeed: "W77" },
    { matchNo: 90, homeSeed: "W73", awaySeed: "W75" },
    { matchNo: 93, homeSeed: "W83", awaySeed: "W84" },
    { matchNo: 94, homeSeed: "W81", awaySeed: "W82" },
    { matchNo: 91, homeSeed: "W76", awaySeed: "W78" },
    { matchNo: 92, homeSeed: "W79", awaySeed: "W80" },
    { matchNo: 95, homeSeed: "W86", awaySeed: "W88" },
    { matchNo: 96, homeSeed: "W85", awaySeed: "W87" },
  ],
  "Quarter-finals": [
    { matchNo: 97, homeSeed: "W89", awaySeed: "W90" },
    { matchNo: 98, homeSeed: "W93", awaySeed: "W94" },
    { matchNo: 99, homeSeed: "W91", awaySeed: "W92" },
    { matchNo: 100, homeSeed: "W95", awaySeed: "W96" },
  ],
  "Semi-finals": [
    { matchNo: 101, homeSeed: "W97", awaySeed: "W98" },
    { matchNo: 102, homeSeed: "W99", awaySeed: "W100" },
  ],
  "3RD PLACE PLAY-OFF": [
    { matchNo: 103, homeSeed: "RU101", awaySeed: "RU102" },
  ],
  "Final": [
    { matchNo: 104, homeSeed: "W101", awaySeed: "W102" },
  ],
};

export const KO_ROUNDS = [
  ["Round of 32", ROUND_OF_32_SLOTS.map((slot) => slot.matchNo)],
  ["Round of 16", KNOCKOUT_PLACEHOLDER_SLOTS["Round of 16"].map((slot) => slot.matchNo)],
  ["Quarter-finals", KNOCKOUT_PLACEHOLDER_SLOTS["Quarter-finals"].map((slot) => slot.matchNo)],
  ["Semi-finals", KNOCKOUT_PLACEHOLDER_SLOTS["Semi-finals"].map((slot) => slot.matchNo)],
  ["3RD PLACE PLAY-OFF", KNOCKOUT_PLACEHOLDER_SLOTS["3RD PLACE PLAY-OFF"].map((slot) => slot.matchNo)],
  ["Final", KNOCKOUT_PLACEHOLDER_SLOTS.Final.map((slot) => slot.matchNo)],
];
