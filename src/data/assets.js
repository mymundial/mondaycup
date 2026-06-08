import goalMp3 from "../assets/goal.mp3";
import missMp3 from "../assets/miss.mp3";
const branding = {
  mondayLogo: "/assets/branding/monday-cup.png",
  mondayCupAd: "/assets/branding/mc-ad-board.png",
  mondayFlat: "/assets/branding/mc-flat.png",
  logo2: "/assets/branding/LOGO2.png",
  myMundialLogo: "/assets/branding/brothers.png",
  brothersDark: "/assets/branding/brothers2.png",
  trophyAd: "/assets/branding/trophy-ad.png",
  trophyPixel: "/assets/branding/trophy_pixel.png",
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
  goalSound: goalMp3,
  missSound: missMp3,
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
  mondayFlat: branding.mondayFlat,
  myMundialLogo: branding.myMundialLogo,
  brothersLogo: branding.myMundialLogo,
  brothersDarkLogo: branding.brothersDark,
  trophyAd: branding.trophyAd,
  trophyPixel: branding.trophyPixel,
  ball: game.ball,
  goalkeeper: game.goalkeeper,
  championBadge: badges.champion,
  runnerUpBadge: badges.runnerUp,
  thirdPlaceBadge: badges.third,
};
