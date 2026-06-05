export const PLAYER_CAREER_STAR_THRESHOLDS = [
  { stars: 1, matchesPlayed: 1, matchesWon: 1, goalsScored: 5 },
  { stars: 2, matchesPlayed: 10, matchesWon: 5, goalsScored: 50 },
  { stars: 3, matchesPlayed: 25, matchesWon: 10, goalsScored: 125 },
  { stars: 4, matchesPlayed: 50, matchesWon: 25, goalsScored: 250 },
  { stars: 5, matchesPlayed: 100, matchesWon: 50, goalsScored: 500 },
];

export const PLAYER_CAREER_ACHIEVEMENT_PAGES = [
  {
    key: "matchesPlayed",
    title: "MATCHES PLAYED",
    statKey: "matchesPlayed",
    rows: [
      { key: "matchesPlayed1", title: "1 ★", target: 1, description: "Play 1 match" },
      { key: "matchesPlayed10", title: "10 ★★", target: 10, description: "Play 10 matches" },
      { key: "matchesPlayed25", title: "25 ★★★", target: 25, description: "Play 25 matches" },
      { key: "matchesPlayed50", title: "50 ★★★★", target: 50, description: "Play 50 matches" },
      { key: "matchesPlayed100", title: "100 ★★★★★", target: 100, description: "Play 100 matches" },
      { key: "matchesPlayed500", title: "500 COMPLETE", target: 500, description: "Play 500 matches" },
    ],
  },
  {
    key: "matchesWon",
    title: "MATCHES WON",
    statKey: "matchesWon",
    rows: [
      { key: "matchesWon1", title: "1 ★", target: 1, description: "Win 1 match" },
      { key: "matchesWon5", title: "5 ★★", target: 5, description: "Win 5 matches" },
      { key: "matchesWon10", title: "10 ★★★", target: 10, description: "Win 10 matches" },
      { key: "matchesWon25", title: "25 ★★★★", target: 25, description: "Win 25 matches" },
      { key: "matchesWon50", title: "50 ★★★★★", target: 50, description: "Win 50 matches" },
      { key: "matchesWon250", title: "250 COMPLETE", target: 250, description: "Win 250 matches" },
    ],
  },
  {
    key: "goalsScored",
    title: "GOALS SCORED",
    statKey: "goalsScored",
    rows: [
      { key: "goalsScored5", title: "5 ★", target: 5, description: "Score 5 goals" },
      { key: "goalsScored50", title: "50 ★★", target: 50, description: "Score 50 goals" },
      { key: "goalsScored125", title: "125 ★★★", target: 125, description: "Score 125 goals" },
      { key: "goalsScored250", title: "250 ★★★★", target: 250, description: "Score 250 goals" },
      { key: "goalsScored500", title: "500 ★★★★★", target: 500, description: "Score 500 goals" },
      { key: "goalsScored1000", title: "1000 COMPLETE", target: 1000, description: "Score 1000 goals" },
    ],
  }
];

export function normalisePlayerCareerStats(stats = {}) {
  return {
    matchesPlayed: Number(stats.matchesPlayed ?? stats.allTimeMatchesPlayed ?? 0),
    matchesWon: Number(stats.matchesWon ?? stats.allTimeMatchesWon ?? 0),
    goalsScored: Number(stats.goalsScored ?? stats.totalGoals ?? stats.allTimeGoals ?? 0),
  };
}

export function playerCareerStarRating(stats = {}) {
  const safeStats = normalisePlayerCareerStats(stats);

  return PLAYER_CAREER_STAR_THRESHOLDS.reduce((rating, threshold) => {
    const achieved =
      safeStats.matchesPlayed >= threshold.matchesPlayed &&
      safeStats.matchesWon >= threshold.matchesWon &&
      safeStats.goalsScored >= threshold.goalsScored;

    return achieved ? threshold.stars : rating;
  }, 0);
}

export function playerCareerStars(stats = {}) {
  const rating = playerCareerStarRating(stats);
  return Array.from({ length: 5 }, (_, index) => ({
    label: `Star ${index + 1}`,
    achieved: index < rating,
  }));
}

export function playerCareerTitle(stats = {}) {
  const rating = playerCareerStarRating(stats);
  const titles = {
    0: "DEBUTANT",
    1: "EXCITING PROSPECT",
    2: "ESTABLISHED PRO",
    3: "NATIONAL HERO",
    4: "INTERNATIONAL SUPERSTAR",
    5: "GLOBAL ICON",
  };
  return titles[rating] || titles[0];
}

export function buildPlayerAchievementPages(stats = {}) {
  const safeStats = normalisePlayerCareerStats(stats);

  return PLAYER_CAREER_ACHIEVEMENT_PAGES.map((page) => ({
    ...page,
    rows: page.rows.map((row) => ({
      ...row,
      unlocked: safeStats[page.statKey] >= row.target,
      currentValue: Math.min(safeStats[page.statKey], row.target),
    })),
  }));
}

