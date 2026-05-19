export const MATCHDAY_PAIRINGS = [
  { week: 1, pairings: [[0, 1], [2, 3]] },
  { week: 2, pairings: [[0, 2], [3, 1]] },
  { week: 3, pairings: [[3, 0], [1, 2]] },
];

export const KO_ROUNDS = [
  ["Round of 32", Array.from({ length: 16 }, (_, i) => 73 + i)],
  ["Round of 16", Array.from({ length: 8 }, (_, i) => 89 + i)],
  ["Quarter-finals", Array.from({ length: 4 }, (_, i) => 97 + i)],
  ["Semi-finals", [101, 102]],
  ["3RD PLACE PLAY-OFF", [103]],
  ["Final", [104]],
];
