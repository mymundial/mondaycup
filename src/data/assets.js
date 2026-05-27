const branding = {
  mondayLogo: "/assets/branding/monday-cup.png",
  mondayCupAd: "/assets/branding/monday-cup-ad.png",
  myMundialLogo: "/assets/branding/mmLOGO.png",
};

const badges = {
  champion: "/assets/badges/mc-champs2.png",
  runnerUp: "/assets/badges/mc-runner-up.png",
  third: "/assets/badges/mc-third-place.png",
};

const game = {
  ball: "/assets/game/ball1.png",
  goalkeeper: "/assets/game/gk1.png",
};

const sounds = {
  userShot: "https://raw.githubusercontent.com/mymundial/mymundial/415282fcde8c537de643f76e83d168f413ee6735/shot2mon.wav",
  opponentShot: "https://raw.githubusercontent.com/mymundial/mymundial/415282fcde8c537de643f76e83d168f413ee6735/Shot5.wav",
};

export const ASSETS = {
  branding,
  badges,
  game,
  sounds,

  // Backwards-compatible aliases for existing components during migration.
  mondayLogo: branding.mondayLogo,
  mondayCupAd: branding.mondayCupAd,
  myMundialLogo: branding.myMundialLogo,
  ball: game.ball,
  goalkeeper: game.goalkeeper,
  championBadge: badges.champion,
  runnerUpBadge: badges.runnerUp,
  thirdPlaceBadge: badges.third,
};
