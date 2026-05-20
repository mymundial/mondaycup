export const MATCHDAY_PAIRINGS = [
  { week: 1, pairings: [[0, 1], [2, 3]] },
  { week: 2, pairings: [[0, 2], [3, 1]] },
  { week: 3, pairings: [[3, 0], [1, 2]] },
];

// Round of 32 slots in the visual bracket order shown on FIFA's knockout bracket.
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

export const KO_ROUNDS = [
  ["Round of 32", ROUND_OF_32_SLOTS.map((slot) => slot.matchNo)],
  ["Round of 16", Array.from({ length: 8 }, (_, i) => 89 + i)],
  ["Quarter-finals", Array.from({ length: 4 }, (_, i) => 97 + i)],
  ["Semi-finals", [101, 102]],
  ["3RD PLACE PLAY-OFF", [103]],
  ["Final", [104]],
];
