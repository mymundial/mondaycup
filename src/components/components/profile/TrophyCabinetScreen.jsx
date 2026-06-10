import { useEffect, useState } from "react";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { Flag } from "../shared.jsx";
import PageTabs, { PageTabsSlot } from "../ui/PageTabs.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import AppPanel from "../ui/AppPanel.jsx";
import { getTeamDisplayName } from "../ui/TeamName.jsx";
import { GROUPS, HOST_TEAMS, TEAM_RANK, getTeamTheme, teamCode } from "../../data/teams.js";
import { buildPlayerAchievementPages, playerCareerStars, playerCareerTitle } from "../../logic/playerCareer.js";

const ALL_NATIONS = Object.values(GROUPS).flat();
const ACHIEVEMENTS_PER_PAGE = 6;
const ACHIEVEMENT_PAGE_COUNT = 3;
const ACHIEVEMENT_UNLOCKED_SRC = "/assets/badges/gold_shield.png";

const EXISTING_ACHIEVEMENT_KEYS = [
  "ourTime",
  "kickOff",
  "woodwork",
  "targetMan",
  "ptsOnTheBoard",
  "victory",
  "cleanSweep",
  "qualified",
  "tko",
  "quarterFinalist",
  "semiFinalist",
  "finalist",
  "cleanSheet",
  "perfect",
  "comebackKing",
  "iceCold",
  "goldenTouch",
  "corruptionScandal",
  "mondayLegend",
  "invincible",
  "nationalTreasure",
  "globalIcon",
  "siuuu",
  "goat",
];

const ACHIEVEMENT_ROWS = Array.from({ length: ACHIEVEMENT_PAGE_COUNT * ACHIEVEMENTS_PER_PAGE }, (_, index) => ({
  key: EXISTING_ACHIEVEMENT_KEYS[index] || `tbcAchievement${index + 1}`,
  title: "TBC",
  description: `Achievement ${String(index + 1).padStart(2, "0")}`,
}));

const PODIUM_BADGES = [
  {
    key: "thirdPlaceFinish",
    title: "Third Place",
    assetSrc: "/assets/badges/mc-third-place.png",
    placeholderSrc: "/assets/badges/bronze_shield.png",
    accent: "#D9822B",
    podiumClass: "border-[#D9822B]/82 bg-[#D9822B] text-[#072D1D] ring-[#D9822B]/28",
  },
  {
    key: "runnerUpFinish",
    title: "Runner-Up",
    assetSrc: "/assets/badges/mc-runner-up.png",
    placeholderSrc: "/assets/badges/silver_shield.png",
    accent: "#C8C8C8",
    podiumClass: "border-[#C8C8C8]/82 bg-[#C8C8C8] text-[#072D1D] ring-[#F5F1E8]/28",
  },
  {
    key: "championFinish",
    title: "Champion",
    assetSrc: "/assets/badges/mc-champs2.png",
    placeholderSrc: "/assets/badges/gold_shield.png",
    accent: "#D8B62F",
    podiumClass: "border-[#D8B62F]/82 bg-[#D8B62F] text-[#072D1D] ring-[#F7D117]/28",
  },
];

const FORCE_REVEAL_TEAM_STICKERS = false;

const STICKER_UNLOCK_RULES = {
  kit: {
    label: "WEAR THE SHIRT",
    requirement: "COMPLETE 1 CAMPAIGN",
    isUnlocked: (record = {}) => Number(record.campaignsCompleted || record.completedCampaigns || 0) >= 1,
  },
  flag: {
    label: "FLY THE FLAG",
    requirement: "QUALIFY KNOCKOUTS",
    isUnlocked: (record = {}) => Boolean(record.knockoutQualified || record.qualifiedForKnockouts || record.qualified || record.reachedKnockouts),
  },
  champions: {
    label: "LIFT THE CUP",
    requirement: "WIN THE CUP",
    isUnlocked: (record = {}) => Boolean(record.cupWon || record.champions || record.champion),
  },
  stopper: {
    label: "SAFE HANDS",
    requirement: "10 GK SAVES",
    isUnlocked: (record = {}) => Number(record.keeperSaves || record.saves || 0) >= 10,
  },
  talisman: {
    label: "TALISMANIC LEADER",
    requirement: "10 WINS",
    isUnlocked: (record = {}) => Number(record.wins || record.matchesWon || 0) >= 10,
  },
  striker: {
    label: "SUPER STRIKER",
    requirement: "25 GOALS",
    isUnlocked: (record = {}) => Number(record.goals || record.totalGoals || 0) >= 25,
  },
};

function stickerUnlockRule(stickerKey) {
  return STICKER_UNLOCK_RULES[stickerKey] || null;
}

function stickerIsUnlocked(record = {}, stickerKey) {
  const rule = stickerUnlockRule(stickerKey);
  return Boolean(rule?.isUnlocked?.(record) || record?.claimable?.[stickerKey]);
}

const STICKER_PROGRESS_TARGETS = {
  kit: 1,
  flag: 1,
  champions: 1,
  stopper: 10,
  talisman: 10,
  striker: 25,
};

function stickerProgressValue(record = {}, stickerKey) {
  switch (stickerKey) {
    case "kit":
      return Number(record.campaignsCompleted || record.completedCampaigns || 0);
    case "flag":
      return Boolean(record.knockoutQualified || record.qualifiedForKnockouts || record.qualified || record.reachedKnockouts) ? 1 : 0;
    case "champions":
      return Boolean(record.cupWon || record.champions || record.champion) ? 1 : 0;
    case "stopper":
      return Number(record.keeperSaves || record.saves || 0);
    case "talisman":
      return Number(record.wins || record.matchesWon || 0);
    case "striker":
      return Number(record.goals || record.totalGoals || 0);
    default:
      return 0;
  }
}

function stickerProgressLabel(record = {}, stickerKey) {
  const target = STICKER_PROGRESS_TARGETS[stickerKey] || 1;
  const current = Math.max(0, Math.min(target, Math.floor(Number(stickerProgressValue(record, stickerKey)) || 0)));
  return `${current}/${target}`;
}

const STICKER_ROLES = [
  { key: "stopper", label: "SAFE HANDS", iconSrc: "/assets/stickers/stopper2.png" },
  { key: "talisman", label: "TALISMANIC LEADER", iconSrc: "/assets/stickers/talisman1.png" },
  { key: "striker", label: "SUPER STRIKER", iconSrc: "/assets/stickers/striker1.png" },
];

const TEAM_STICKER_KEYS = ["kit", "flag", "champions", "stopper", "talisman", "striker"];
const GROUP_KEYS = Object.keys(GROUPS);

function TrophyToggle({ value, onChange }) {
  return (
    <PageTabs
      value={value}
      onChange={onChange}
      options={[
        { value: "player", label: "PLAYER" },
        { value: "teams", label: "TEAMS" },
      ]}
    />
  );
}

function TrophySection({ title, children, compactTitle = false, compactBody = false }) {
  const titleClass = compactTitle
    ? "px-4 pb-1.5 pt-3 text-center home-copy-bold text-[22px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]"
    : "px-4 pb-4 pt-4 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]";
  const bodyClass = title
    ? compactBody
      ? "px-3.5 pb-3"
      : "px-3.5 pb-4"
    : compactBody
      ? "px-3.5 py-3"
      : "px-3.5 py-4";

  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.6rem" className="text-[#F5F1E8]">
      {title && (
        <div className={titleClass}>
          {title}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </AppPanel>
  );
}

function TrophyCount({ children }) {
  return <div className="pt-3 text-center home-copy-bold text-[10px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">{children}</div>;
}

function TrophyProgressMeter({ unlocked = 0, total = 63 }) {
  const safeTotal = Math.max(1, Number(total || 63));
  const safeUnlocked = Math.max(0, Math.min(Number(unlocked || 0), safeTotal));
  const progress = Math.round((safeUnlocked / safeTotal) * 100);

  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.35rem" className="px-4 py-3 text-[#F5F1E8]">
      <div className="text-center home-copy-bold text-[12px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">
        Progress
      </div>
      <div className="mt-3 h-[10px] overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#062819]/86 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
        <div
          className="h-full rounded-full bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.34)]"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 text-center home-copy-regular text-[7px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]/72">
        {progress}% Complete
      </div>
    </AppPanel>
  );
}

function ArrowButton({ direction, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]"
      aria-label={ariaLabel || (direction === "left" ? "Previous" : "Next")}
    >
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {direction === "left" ? <path d="M15 5L8 12L15 19" /> : <path d="M9 5L16 12L9 19" />}
      </svg>
    </button>
  );
}

function AchievementSectionTitle({ title, onPrevious, onNext }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
      <ArrowButton direction="left" onClick={onPrevious} ariaLabel="Previous player achievements" />
      <div className="min-w-0 text-center">
        <span>{title}</span>
      </div>
      <ArrowButton direction="right" onClick={onNext} ariaLabel="Next player achievements" />
    </div>
  );
}

function AchievementCheck({ unlocked }) {
  return (
    <div
      className={`flex h-[28px] w-[28px] items-center justify-center rounded-[0.55rem] border transition-all ${
        unlocked
          ? "border-[#F7D117] bg-[#F7D117] text-[#06351F] shadow-[0_0_10px_rgba(247,209,23,0.26),inset_0_1px_0_rgba(255,255,255,0.34)]"
          : "border-[#F5F1E8]/26 bg-[#031B12]/34 text-transparent shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5L10 17.5L19 6.5" />
      </svg>
    </div>
  );
}

function achievementTitleText(title = "") {
  return String(title).replace(/\s*(★+|COMPLETE)\s*$/i, "").trim();
}

function LockedAchievementIcon({ title }) {
  return (
    <div className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#F5F1E8]/18 bg-[#031B12]/40 ring-1 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
      <div className="absolute inset-[5px] rounded-full border border-[#F5F1E8]/12" aria-hidden="true" />
      <span className="relative z-[1] home-copy-bold text-[17px] uppercase leading-none tracking-[0.02em] text-[#F7D117]/54" aria-label={achievementTitleText(title)}>
        ★
      </span>
    </div>
  );
}

function AchievementRewardIcon({ item, unlocked }) {
  if (unlocked) {
    return (
      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#F7D117]/46 bg-[#031B12]/42 ring-1 ring-[#F7D117]/24 shadow-[0_0_12px_rgba(247,209,23,0.18)]">
        <img src={ACHIEVEMENT_UNLOCKED_SRC} alt="" className="h-[33px] w-[33px] object-contain" draggable={false} />
      </div>
    );
  }

  return <LockedAchievementIcon title={item?.title} />;
}

function achievementStarCount(title = "") {
  const match = String(title).match(/(★+)/);
  return match ? match[1].length : 0;
}

function achievementIsComplete(title = "") {
  return /COMPLETE/i.test(String(title));
}

function AchievementTierMark({ item, unlocked }) {
  const starCount = achievementStarCount(item?.title);
  const isComplete = achievementIsComplete(item?.title);
  const starTone = unlocked
    ? "text-[#F7D117] opacity-100 drop-shadow-[0_0_8px_rgba(247,209,23,0.26)]"
    : "text-[#F7D117] opacity-42";

  if (isComplete || item?.statusMode === "complete") {
    return (
      <span className={`home-copy-bold text-[11px] uppercase leading-none tracking-[0.14em] ${unlocked ? "text-[#18D46B] opacity-100 drop-shadow-[0_0_8px_rgba(24,212,107,0.22)]" : "text-[#F7D117] opacity-28"}`}>
        {unlocked ? "COMPLETE" : "INCOMPLETE"}
      </span>
    );
  }

  return (
    <span className={`flex items-center justify-center gap-1.5 ${starTone}`} aria-label={`${starCount} star achievement`}>
      {Array.from({ length: Math.max(1, starCount) }, (_, index) => (
        <svg key={index} viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="currentColor" aria-hidden="true">
          <path d="M12 2.4l2.65 5.65 6.2.78-4.55 4.28 1.16 6.13L12 16.22 6.54 19.24 7.7 13.1 3.15 8.83l6.2-.78L12 2.4z" />
        </svg>
      ))}
    </span>
  );
}

function AchievementRow({ item, number }) {
  const unlocked = Boolean(item.unlocked);
  const cappedValue = Math.min(Number(item.currentValue || 0), Number(item.target || 0));
  const targetValue = Number(item.target || 0);
  const isCareerHighlight = Boolean(item.isCareerHighlight);

  if (isCareerHighlight) {
    return (
      <div className={`relative grid min-h-[56px] grid-cols-[30px_minmax(0,1fr)_44px] items-center gap-x-2 rounded-[1.15rem] border px-3 py-1.5 ring-1 transition-all ${item.failedPermanently ? "opacity-42" : "opacity-100"} ${unlocked ? "border-[#F7D117]/78 bg-[#063B23]/78 text-[#F5F1E8] ring-[#F7D117]/22 shadow-[0_0_14px_rgba(247,209,23,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]" : "border-[#F5F1E8]/14 bg-[#031B12]/46 text-[#F5F1E8] ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"}`}>
        <div className="col-start-1 flex h-full items-center justify-start">
          <AchievementCheck unlocked={unlocked} />
        </div>

        <div className="col-start-2 flex min-w-0 flex-col items-start justify-center gap-0.5 text-left">
          <span className="home-copy-bold max-w-full truncate text-[15px] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">
            {achievementTitleText(item.title)}
          </span>
          <span className="home-copy-bold max-w-full truncate text-[9px] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]/62">
            {item.description}
          </span>
        </div>

        <div className="col-start-3 flex h-full items-center justify-end">
          <AchievementRewardIcon item={item} unlocked={unlocked} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative grid min-h-[56px] grid-cols-[30px_minmax(0,0.78fr)_minmax(0,1.18fr)_minmax(0,0.78fr)_44px] items-center gap-x-2 rounded-[1.15rem] border px-3 py-1.5 ring-1 transition-all ${unlocked ? "border-[#F7D117]/78 bg-[#063B23]/78 text-[#F5F1E8] ring-[#F7D117]/22 shadow-[0_0_14px_rgba(247,209,23,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]" : "border-[#F5F1E8]/14 bg-[#031B12]/46 text-[#F5F1E8] ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"}`}>
      <div className="col-start-1 flex h-full items-center justify-start">
        <AchievementCheck unlocked={unlocked} />
      </div>

      <div className="col-start-2 flex h-full items-center justify-start">
        <span className="home-copy-bold text-[16px] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">
          {achievementTitleText(item.title)}
        </span>
      </div>

      <div className="col-start-3 flex h-full items-center justify-center">
        <AchievementTierMark item={item} unlocked={unlocked} />
      </div>

      <div className="col-start-4 flex h-full items-center justify-end">
        <span className="max-w-full truncate text-right home-copy-bold text-[10px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]/70">
          {cappedValue}/{targetValue}
        </span>
      </div>

      <div className="col-start-5 flex h-full items-center justify-end">
        <AchievementRewardIcon item={item} unlocked={unlocked} />
      </div>
    </div>
  );
}


function debutGoalAchieved(careerStats = {}, achievements = {}) {
  const goalsScored = trophyNumber(careerStats.goalsScored ?? careerStats.totalGoals ?? careerStats.allTimeGoals);
  return Boolean(achievements.targetMan || goalsScored >= 1);
}

function debutGoalFailed(careerStats = {}, achievements = {}) {
  const matchesPlayed = trophyNumber(careerStats.matchesPlayed ?? careerStats.allTimeMatchesPlayed);
  return matchesPlayed >= 1 && !debutGoalAchieved(careerStats, achievements);
}

function AchievementRatingPanel({ careerStats = {} }) {
  const stars = playerCareerStars(careerStats);
  const ratingLabel = playerCareerTitle(careerStats);

  return (
    <div>
      <TrophySection title="PLAYER RATING" compactTitle compactBody>
        <div className="flex flex-col items-center justify-center gap-1 py-0 text-center">
          <div className="home-copy-bold text-[11px] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]/76">
            {ratingLabel}
          </div>
          <div className="flex items-center justify-center gap-2 text-[#F7D117] drop-shadow-[0_0_10px_rgba(247,209,23,0.22)]" aria-label={`${ratingLabel} player rating`}>
            {stars.map((star, index) => (
              <svg key={star.label || index} viewBox="0 0 24 24" className={`h-[27px] w-[27px] ${star.achieved ? "opacity-100" : "opacity-24"}`} fill="currentColor" aria-hidden="true">
                <path d="M12 2.4l2.65 5.65 6.2.78-4.55 4.28 1.16 6.13L12 16.22 6.54 19.24 7.7 13.1 3.15 8.83l6.2-.78L12 2.4z" />
              </svg>
            ))}
          </div>
        </div>
      </TrophySection>
    </div>
  );
}


function PodiumBadgeCard({ unlocked, title, assetSrc, placeholderSrc, podiumClass = "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10" }) {
  const toneClass = unlocked ? podiumClass : "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-[#F5F1E8]/10";
  return (
    <div className={`grid h-[112px] min-h-[112px] grid-rows-[70px_auto] place-items-center rounded-[1.25rem] border px-2.5 py-3 text-center ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_7px_14px_rgba(0,0,0,0.12)] ${toneClass}`}>
      <div className="flex h-[70px] w-full items-center justify-center overflow-hidden">
        <img src={unlocked ? assetSrc : placeholderSrc} alt="" className="h-[58px] w-[58px] max-h-[58px] max-w-[58px] object-contain" />
      </div>
      <div className={`home-copy-bold mt-1 text-[9px] uppercase leading-none tracking-[0.11em] ${unlocked ? "text-[#072D1D]" : "text-[#F5F1E8]"}`}>{title}</div>
    </div>
  );
}

function effectiveStickerRecord(progress = {}, nationCupWins = {}, team) {
  const record = getStickerRecord(progress, team);
  const legacyCupWon = Boolean(nationCupWins?.[team]?.unlocked);
  return {
    ...record,
    cupWon: Boolean(record?.cupWon || legacyCupWon),
  };
}

function teamHasCompletedAllStickers(progress = {}, nationCupWins = {}, team) {
  if (FORCE_REVEAL_TEAM_STICKERS) return true;
  const record = effectiveStickerRecord(progress, nationCupWins, team);
  return TEAM_STICKER_KEYS.every((key) => stickerIsUnlocked(record, key));
}

function groupIndexForTeam(team) {
  const foundIndex = GROUP_KEYS.findIndex((groupKey) => GROUPS[groupKey]?.includes(team));
  return foundIndex >= 0 ? foundIndex : 0;
}

function defaultTeamIndexFor(userTeam) {
  const foundIndex = ALL_NATIONS.indexOf(userTeam);
  return foundIndex >= 0 ? foundIndex : 0;
}

function trophyNumber(value = 0) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function unlockedNationCupCount(nationCupWins = {}) {
  return ALL_NATIONS.reduce((total, team) => total + (nationCupWins?.[team]?.unlocked ? 1 : 0), 0);
}

function buildCareerHighlightPage(careerStats = {}, achievements = {}, nationCupWins = {}) {
  const matchesPlayed = trophyNumber(careerStats.matchesPlayed ?? careerStats.allTimeMatchesPlayed);
  const matchesWon = trophyNumber(careerStats.matchesWon ?? careerStats.allTimeMatchesWon);
  const goalsScored = trophyNumber(careerStats.goalsScored ?? careerStats.totalGoals ?? careerStats.allTimeGoals);
  const cupWins = trophyNumber(careerStats.cupWins ?? careerStats.cupsWon ?? careerStats.mondayCupWins);
  const nationWins = unlockedNationCupCount(nationCupWins);

  const rows = [
    {
      key: "careerRememberTheName",
      title: "Remember the name",
      description: "Score on your debut",
      target: 1,
      currentValue: achievements.targetMan || goalsScored >= 1 ? 1 : 0,
      failedPermanently: debutGoalFailed(careerStats, achievements),
    },
    {
      key: "careerNationalPride",
      title: "National pride",
      description: "Win the Monday Cup",
      target: 1,
      currentValue: achievements.championFinish || cupWins >= 1 ? 1 : 0,
    },
    {
      key: "careerGrizzledVeteran",
      title: "Grizzled Veteran",
      description: "Play 500 matches",
      target: 500,
      currentValue: matchesPlayed,
    },
    {
      key: "careerSerialWinner",
      title: "Serial Winner",
      description: "Win 250 matches",
      target: 250,
      currentValue: matchesWon,
    },
    {
      key: "careerSiuuu",
      title: "SIUUU!",
      description: "Score 1000 goals",
      target: 1000,
      currentValue: achievements.siuuu || goalsScored >= 1000 ? 1000 : goalsScored,
    },
    {
      key: "careerGoat",
      title: "G.O.A.T.",
      description: "Win with all 48 teams",
      target: 48,
      currentValue: achievements.goat || achievements.globalIcon || nationWins >= 48 ? 48 : nationWins,
    },
  ];

  return {
    key: "careerHighlights",
    title: "CAREER HIGHLIGHTS",
    rows: rows.map((row) => ({
      ...row,
      currentValue: Math.min(trophyNumber(row.currentValue), trophyNumber(row.target)),
      unlocked: trophyNumber(row.currentValue) >= trophyNumber(row.target),
      statusMode: "complete",
      isCareerHighlight: true,
    })),
  };
}

function teamIsPurchased(team, allTeamsUnlocked = false) {
  return Boolean(
    allTeamsUnlocked ||
    HOST_TEAMS.some((host) => host?.name === team)
  );
}

function shinyFlagButtonStyle() {
  return {
    backgroundColor: "#D9E2DE",
    backgroundImage: [
      "radial-gradient(circle at 18% 24%, rgba(255,255,255,0.88) 0 1px, transparent 2.4px)",
      "radial-gradient(circle at 76% 36%, rgba(247,209,23,0.50) 0 1.1px, transparent 2.8px)",
      "linear-gradient(112deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.62) 28%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.36) 62%, rgba(255,255,255,0) 100%)",
      "conic-gradient(from 158deg at 50% 46%, #F9FFF9, #B8F7FF, #E5CBFF, #FFF4A9, #F7D117, #0B6B3A, #F9FFF9)",
      "linear-gradient(145deg, #F6FFF9 0%, #B7C2C6 28%, #F8FFFB 48%, #AEB8BD 68%, #E9F2EE 100%)",
    ].join(", "),
    backgroundBlendMode: "screen, screen, screen, soft-light, normal",
    backgroundSize: "34px 30px, 46px 42px, 190% 100%, 150% 150%, cover",
    backgroundPosition: "0 0, 12px 8px, -25% 0, 50% 50%, 0 0",
  };
}

function TeamPadlockIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M10.25 14.1V10.7C10.25 7.45 12.55 5 16 5s5.75 2.45 5.75 5.7v3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="7.25" y="13.25" width="17.5" height="13.25" rx="3" fill="currentColor" />
      <circle cx="16" cy="19.15" r="1.75" fill="#06351F" />
      <path d="M16 20.4v3.15" stroke="#06351F" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function GroupFlagTile({ team, completed, selected, lockedTeam = false, onClick }) {
  const flagMuted = lockedTeam;
  const buttonStyle = completed && !selected && !lockedTeam ? shinyFlagButtonStyle() : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[58px] min-w-0 items-center justify-center overflow-hidden rounded-[1rem] border px-2 ring-1 transition-all active:scale-[0.98] ${
        selected
          ? "border-[#F7D117]/88 bg-[#F7D117] ring-[#F7D117]/34 shadow-[0_0_14px_rgba(247,209,23,0.20),inset_0_1px_0_rgba(255,255,255,0.26)]"
          : completed && !lockedTeam
            ? "border-[#F5F1E8]/68 text-[#062819] ring-[#F7D117]/20 shadow-[0_0_14px_rgba(247,209,23,0.10),inset_0_1px_0_rgba(255,255,255,0.28)]"
            : "border-[#F5F1E8]/14 bg-[#031B12]/46 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]"
      }`}
      style={buttonStyle}
      aria-label={getTeamDisplayName(team, "title")}
    >
      {completed && !selected && !lockedTeam && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.36)]"
          aria-hidden="true"
        />
      )}
      <div className="relative z-[2] flex h-[32px] w-[48px] items-center justify-center overflow-hidden rounded-[0.48rem] bg-[#F5F1E8] p-[3px] shadow-[0_4px_10px_rgba(0,0,0,0.22)]">
        <Flag team={team} className={`block h-full w-full rounded-[0.36rem] object-cover ${flagMuted ? "opacity-42 saturate-0 brightness-[0.72]" : ""}`} />
        {lockedTeam && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[#F7D117] drop-shadow-[0_2px_4px_rgba(0,0,0,0.58)]">
            <TeamPadlockIcon className="h-6 w-6" />
          </div>
        )}
      </div>
    </button>
  );
}

function GroupFlagWallTitle({ groupKey, onPrevious, onNext }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <ArrowButton direction="left" onClick={onPrevious} ariaLabel="Previous group" />
      <div className="min-w-0 text-center">
        <div className="truncate home-copy-bold text-[22px] uppercase leading-none tracking-[0.1em] text-[#F5F1E8]">
          GROUP {groupKey}
        </div>
      </div>
      <ArrowButton direction="right" onClick={onNext} ariaLabel="Next group" />
    </div>
  );
}

function GroupFlagWall({ groupKey, teams = [], activeTeam, onPrevious, onNext, onSelectTeam, nationStickerProgress = {}, nationCupWins = {}, allTeamsUnlocked = false }) {
  return (
    <TrophySection title={<GroupFlagWallTitle groupKey={groupKey} onPrevious={onPrevious} onNext={onNext} />}>
      <div className="rounded-[1.25rem] border border-[#F5F1E8]/10 bg-[#031B12]/46 p-2.5 ring-1 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
        <div className="grid grid-cols-4 mc-panel-grid-gap">
          {teams.map((team) => (
            <GroupFlagTile
              key={team}
              team={team}
              selected={team === activeTeam}
              completed={teamHasCompletedAllStickers(nationStickerProgress, nationCupWins, team)}
              lockedTeam={!teamIsPurchased(team, allTeamsUnlocked)}
              onClick={() => onSelectTeam?.(team)}
            />
          ))}
        </div>
      </div>
    </TrophySection>
  );
}

function TeamStickerTitle({ team, index, total, onPrevious, onNext }) {
  return (
    <div className="grid w-full grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2">
      <ArrowButton direction="left" onClick={onPrevious} ariaLabel="Previous team" />
      <div className="min-w-0 text-center">
        <div className="truncate home-copy-bold text-[22px] uppercase leading-none tracking-[0.1em] text-[#F5F1E8]">
          {getTeamDisplayName(team, "title")}
        </div>

      </div>
      <ArrowButton direction="right" onClick={onNext} ariaLabel="Next team" />
    </div>
  );
}

function getStickerRecord(progress = {}, team) {
  return progress?.[team] || {};
}

function stickerHasOpened(record = {}, stickerKey) {
  if (stickerKey === "champions") return Boolean(record?.opened?.champions || record?.opened?.icon);
  return Boolean(record?.opened?.[stickerKey]);
}

function buildStickerStyle({ team, shiny = false, opened = false }) {
  if (!opened) return {};
  const theme = getTeamTheme(team);
  const bg = theme.bg || theme.first || "#0B6B3A";
  const text = theme.text || theme.second || "#F5F1E8";
  const accent = theme.accent || theme.third || "#F7D117";

  if (shiny) {
    return {
      color: "#FFFFFF",
      borderColor: "rgba(245,241,232,0.84)",
      backgroundColor: "#D9E2DE",
      backgroundImage: [
        "radial-gradient(circle at 18% 24%, rgba(255,255,255,0.95) 0 1px, transparent 2.4px)",
        "radial-gradient(circle at 76% 36%, rgba(247,209,23,0.58) 0 1.1px, transparent 2.8px)",
        "radial-gradient(circle at 44% 72%, rgba(122,249,255,0.58) 0 1px, transparent 2.6px)",
        "linear-gradient(112deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.72) 28%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.42) 62%, rgba(255,255,255,0) 100%)",
        `conic-gradient(from 158deg at 50% 46%, #F9FFF9, #B8F7FF, #E5CBFF, #FFF4A9, ${accent}, ${bg}, #F9FFF9)`,
        "linear-gradient(145deg, #F6FFF9 0%, #B7C2C6 28%, #F8FFFB 48%, #AEB8BD 68%, #E9F2EE 100%)",
      ].join(", "),
      backgroundBlendMode: "screen, screen, screen, screen, soft-light, normal",
      backgroundSize: "34px 30px, 46px 42px, 28px 36px, 190% 100%, 150% 150%, cover",
      backgroundPosition: "0 0, 12px 8px, 5px 15px, -25% 0, 50% 50%, 0 0",
      boxShadow:
        "0 18px 34px rgba(0,0,0,0.34), 0 0 24px rgba(122,249,255,0.16), 0 0 20px rgba(247,209,23,0.16), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -18px 32px rgba(0,0,0,0.18)",
    };
  }

  return {
    color: text,
    borderColor: text,
    background: `linear-gradient(145deg, ${bg}, ${bg} 54%, rgba(0,0,0,0.18))`,
    boxShadow:
      "0 12px 24px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 20px rgba(0,0,0,0.16)",
  };
}

function StickerQuestionBox({ claimable = false, featured = false, onOpen }) {
  const baseClass = "mc-sticker-icon-box h-[clamp(48px,16vw,62px)] w-[clamp(48px,16vw,62px)] rounded-[0.95rem]";
  if (claimable) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${baseClass} relative z-[2] flex items-center justify-center border border-[#F7D117] bg-[#F7D117] text-[#06351F] shadow-[0_0_18px_rgba(247,209,23,0.28),inset_0_1px_0_rgba(255,255,255,0.32)] active:scale-[0.97]`}
        aria-label="Open sticker"
      >
        <span className="home-copy-bold text-[34px] uppercase leading-none tracking-[0.04em]">?</span>
      </button>
    );
  }

  return (
    <div className={`${baseClass} relative z-[2] flex items-center justify-center border border-[#F5F1E8]/14 bg-[#031B12]/46 text-[#F5F1E8]/34 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]`}>
      <span className="home-copy-bold text-[32px] uppercase leading-none tracking-[0.04em]">?</span>
    </div>
  );
}


function StickerLockedTeamBox() {
  return (
    <div className="mc-sticker-icon-box relative z-[2] flex h-[clamp(48px,16vw,62px)] w-[clamp(48px,16vw,62px)] items-center justify-center rounded-[0.95rem] border border-[#F7D117]/42 bg-[#031B12]/46 text-[#F7D117] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
      <TeamPadlockIcon className="h-9 w-9 drop-shadow-[0_2px_5px_rgba(0,0,0,0.50)]" />
    </div>
  );
}


function StickerShineOverlay({ shiny }) {
  if (!shiny) return null;
  const edgeMask = {
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    padding: "10px",
  };

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-[1] monday-sticker-sparkle-noise opacity-74 mix-blend-screen"
        style={edgeMask}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] monday-sticker-rainbow-shine opacity-70 mix-blend-screen"
        style={edgeMask}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-[6px] z-[1] rounded-[inherit] border border-white/34 opacity-78 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-[12px] z-[1] rounded-[1rem] border border-[#F7D117]/18 opacity-42"
        aria-hidden="true"
      />
    </>
  );
}

function StickerFrameShineOverlay({ active, team }) {
  if (!active) return null;
  const theme = getTeamTheme(team);
  const bg = theme.bg || theme.first || "#0B6B3A";
  const edgeMask = {
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    padding: "12px",
  };

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-48 mix-blend-screen"
        style={{
          ...edgeMask,
          backgroundImage: [
            "radial-gradient(circle at 16% 22%, rgba(255,255,255,0.82) 0 1px, transparent 2.4px)",
            "radial-gradient(circle at 84% 64%, rgba(255,255,255,0.58) 0 1px, transparent 2.6px)",
            "linear-gradient(118deg, transparent 0%, rgba(255,255,255,0.48) 34%, rgba(122,249,255,0.18) 48%, transparent 66%)",
          ].join(", "),
          backgroundSize: "28px 26px, 36px 34px, 180% 100%",
          backgroundPosition: "0 0, 11px 8px, -18% 0",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-[10px] z-[1] rounded-[0.95rem]"
        style={{ background: `linear-gradient(145deg, ${bg}, ${bg} 66%, rgba(0,0,0,0.16))` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-[2px] z-[1] rounded-[1.1rem] border border-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
        aria-hidden="true"
      />
    </>
  );
}

function ShinyStickerCrest({ team, featured = false }) {
  const theme = getTeamTheme(team);
  const code = teamCode(team);
  const crestSize = featured ? "h-[96px] w-[94px]" : "h-[58px] w-[56px]";
  const flagSize = featured ? "h-[30px] w-[48px]" : "h-[18px] w-[28px]";
  const codeSize = featured ? "text-[20px]" : "text-[10px]";

  return (
    <div className={`relative flex ${crestSize} items-center justify-center`}>
      <div
        className="absolute inset-0 border border-white/70 bg-[#0B3F28] shadow-[0_0_0_2px_rgba(247,209,23,0.34),inset_0_1px_0_rgba(255,255,255,0.48),inset_0_-9px_18px_rgba(0,0,0,0.28)]"
        style={{
          clipPath: "polygon(50% 0%, 89% 13%, 84% 70%, 50% 98%, 16% 70%, 11% 13%)",
          background: `linear-gradient(148deg, rgba(255,255,255,0.18), transparent 30%), linear-gradient(145deg, ${theme.bg || "#0B6B3A"}, #062819 72%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-[7px] border border-white/38 bg-black/18"
        style={{ clipPath: "polygon(50% 2%, 86% 15%, 80% 68%, 50% 93%, 20% 68%, 14% 15%)" }}
        aria-hidden="true"
      />
      <div className="relative z-[2] flex flex-col items-center gap-1.5 text-center">
        <div className={`${flagSize} overflow-hidden rounded-[0.35rem] border border-white/50 bg-black/20`}>
          <Flag team={team} className="h-full w-full object-cover" />
        </div>
        <div className={`home-copy-bold ${codeSize} uppercase leading-none tracking-[0.11em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.48)]`}>
          {code}
        </div>
      </div>
    </div>
  );
}

function stickerPlayerFor(team, stickerKey, role = {}) {
  if (team === "Mexico" && stickerKey === "icon") {
    return { name: "SANCHEZ", number: "9" };
  }
  if (stickerKey === "icon") {
    return { name: teamCode(team), number: "9" };
  }
  return {
    name: role.fallbackName || "TBC",
    number: role.fallbackNumber || "0",
  };
}

function teamStickerRank(team) {
  const ranked = Number(TEAM_RANK?.[team]);
  if (Number.isFinite(ranked) && ranked > 0) return String(ranked).padStart(2, "0");
  const index = ALL_NATIONS.indexOf(team);
  return String(Math.max(1, index + 1)).padStart(2, "0");
}

function StickerShirtBack({ team, name, number, footerLabel }) {
  const theme = getTeamTheme(team);
  const bg = theme.bg || "#0B6B3A";
  const text = theme.text || "#F5F1E8";
  return (
    <div
      className="relative aspect-[5/7] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[0.88rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
      style={{
        borderColor: text,
        background: `radial-gradient(circle at 50% 7%, rgba(255,255,255,0.17), transparent 32%), linear-gradient(145deg, ${bg}, ${bg} 58%, rgba(0,0,0,0.24))`,
      }}
    >
      <div className="absolute left-1/2 top-[6.5%] z-[2] h-[16%] w-[23%] -translate-x-1/2">
        <img src="/assets/branding/monday-cup.png" alt="" className="h-full w-full object-contain" draggable={false} />
      </div>
      <div
        className="absolute left-1/2 top-[29%] z-[2] w-[88%] -translate-x-1/2 truncate text-center home-copy-bold text-[9px] uppercase leading-none tracking-[0.08em]"
        style={{ color: text }}
      >
        {name}
      </div>
      <div
        className="absolute left-1/2 top-[53.5%] z-[2] w-[92%] -translate-x-1/2 -translate-y-1/2 truncate text-center home-copy-bold text-[39px] uppercase leading-none tracking-[-0.04em]"
        style={{ color: text }}
      >
        {number}
      </div>
      <div
        className="absolute bottom-[8%] left-1/2 z-[2] w-[86%] -translate-x-1/2 truncate text-center home-copy-bold text-[5.9px] uppercase leading-none tracking-[0.12em] opacity-88"
        style={{ color: text }}
      >
        {footerLabel}
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(160deg,rgba(255,255,255,0.12),transparent_31%,rgba(0,0,0,0.10)_100%)]" />
    </div>
  );
}


function StickerTopLogo() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[11.8%] z-[5] h-[11.5%] w-[19.5%] -translate-x-1/2">
      <img src="/assets/branding/monday-cup.png" alt="" className="h-full w-full object-contain" draggable={false} />
    </div>
  );
}

function StickerTopDescription({ children, colour = "#F5F1E8" }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[7.5%] z-[5] flex h-[14%] w-[86%] -translate-x-1/2 items-center justify-center truncate text-center home-copy-bold text-[6.2px] uppercase leading-none tracking-[0.13em]"
      style={{ color: colour }}
    >
      {children}
    </div>
  );
}

function StickerBottomLabel({ children, colour = "#F5F1E8" }) {
  return (
    <div
      className="pointer-events-none absolute bottom-[18%] left-1/2 z-[5] w-[86%] -translate-x-1/2 truncate text-center home-copy-bold text-[6px] uppercase leading-none tracking-[0.14em]"
      style={{ color: colour }}
    >
      {children}
    </div>
  );
}

function StickerProgressIndicator({ children, colour = "#F7D117" }) {
  return (
    <div
      className="pointer-events-none absolute bottom-[8.6%] left-1/2 z-[5] w-[86%] -translate-x-1/2 truncate text-center home-copy-bold text-[5.8px] uppercase leading-none tracking-[0.13em]"
      style={{ color: colour }}
    >
      {children}
    </div>
  );
}

function StickerIconStage({ children }) {
  return (
    <div className="pointer-events-none relative z-[3] flex h-full w-full items-center justify-center text-center">
      <div className="mc-sticker-icon-box flex h-[clamp(48px,16vw,62px)] w-[clamp(48px,16vw,62px)] items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ChampionsSticker() {
  return (
    <StickerIconStage>
      <img
        src="/assets/stickers/mc-trophy.png"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </StickerIconStage>
  );
}

function RoleBadgeSticker({ iconSrc }) {
  return (
    <StickerIconStage>
      <img
        src={iconSrc}
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </StickerIconStage>
  );
}

function KitSticker() {
  return (
    <StickerIconStage>
      <img
        src="/assets/stickers/kit1.png"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </StickerIconStage>
  );
}

function FlagSticker({ team }) {
  return (
    <StickerIconStage>
      <div className="flex h-[34px] w-[50px] items-center justify-center overflow-hidden rounded-[0.58rem] border border-[#F5F1E8] bg-[#F5F1E8] p-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.34)]">
        <Flag team={team} className="h-full w-full rounded-[0.38rem] object-cover" />
      </div>
    </StickerIconStage>
  );
}

function OpenStickerContent({ label, team, stickerKey, role = {} }) {
  if (stickerKey === "kit") {
    return <KitSticker />;
  }

  if (stickerKey === "flag") {
    return <FlagSticker team={team} />;
  }

  if (stickerKey === "champions") {
    return <ChampionsSticker />;
  }

  return <RoleBadgeSticker iconSrc={role.iconSrc} />;
}

function StickerBookSlot({
  label,
  team,
  stickerKey,
  role = {},
  layout = "portrait",
  nationStickerProgress = {},
  nationCupWins = {},
  lockedTeam = false,
  onOpenSticker,
}) {
  const record = getStickerRecord(nationStickerProgress, team);
  const legacyCupWon = Boolean(nationCupWins?.[team]?.unlocked);
  const effectiveRecord = {
    ...record,
    cupWon: Boolean(record?.cupWon || legacyCupWon),
  };
  const unlocked = !lockedTeam && (FORCE_REVEAL_TEAM_STICKERS || stickerIsUnlocked(effectiveRecord, stickerKey));
  const opened = !lockedTeam && unlocked && (FORCE_REVEAL_TEAM_STICKERS || Boolean(stickerHasOpened(effectiveRecord, stickerKey)));
  const claimable = Boolean(!opened && unlocked);
  const locked = !opened && !claimable;
  const shinyFrame = Boolean(opened && ["kit", "flag", "champions", "stopper", "talisman", "striker"].includes(stickerKey));
  const shiny = shinyFrame;
  const style = buildStickerStyle({ team, shiny, opened });
  const slotSizeClass = "aspect-[3/4] min-w-0 p-[clamp(0.45rem,2.2vw,0.625rem)]";
  const rule = stickerUnlockRule(stickerKey);
  const titleColour = opened ? (getTeamTheme(team).text || "#F5F1E8") : "#F5F1E8";
  const progressLabel = stickerProgressLabel(effectiveRecord, stickerKey);
  const progressColour = opened || claimable ? "#F7D117" : "rgba(245,241,232,0.62)";

  return (
    <div
      className={`relative flex flex-col items-center justify-between overflow-hidden rounded-[1.25rem] border text-center ring-1 transition-all ${
        opened
          ? "border-[#F5F1E8]/42 bg-[#052D1D]/72 ring-[#F7D117]/26"
          : claimable
            ? "border-[#F7D117]/82 bg-[#052D1D]/72 ring-[#F7D117]/28"
            : "border-[#F5F1E8]/14 bg-[#031B12]/46 ring-[#F5F1E8]/8"
      } mc-sticker-book-slot ${slotSizeClass}`}
      style={style}
    >
      <StickerShineOverlay shiny={shinyFrame && opened} />
      <StickerFrameShineOverlay active={shinyFrame && opened} team={team} />
      {!opened && (
        <>
          <div className={`absolute inset-2 rounded-[0.95rem] border border-dashed ${claimable ? "border-[#F7D117]/42" : "border-[#F5F1E8]/14"}`} aria-hidden="true" />
          <StickerTopDescription colour={lockedTeam ? "#F7D117" : claimable ? "#F7D117" : "#F5F1E8"}>
            {lockedTeam ? "LOCKED" : claimable ? "Tap to open" : locked ? (rule?.requirement || "Locked") : "Sticker"}
          </StickerTopDescription>
          <div className="absolute left-1/2 top-1/2 z-[2] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            {lockedTeam ? (
              <StickerLockedTeamBox />
            ) : (
              <StickerQuestionBox
                claimable={claimable}
                featured={false}
                onOpen={() => onOpenSticker?.(team, stickerKey)}
              />
            )}
          </div>
          <StickerBottomLabel colour="#F5F1E8">{label}</StickerBottomLabel>
          <StickerProgressIndicator colour={progressColour}>{progressLabel}</StickerProgressIndicator>
        </>
      )}
      {opened && (
        <>
          <OpenStickerContent label={label} team={team} stickerKey={stickerKey} role={role} />
          <StickerTopLogo />
          <StickerBottomLabel colour={titleColour}>{label}</StickerBottomLabel>
        </>
      )}
    </div>
  );
}

function TeamStickerBook({
  team,
  index,
  total,
  onPrevious,
  onNext,
  nationStickerProgress = {},
  nationCupWins = {},
  lockedTeam = false,
  onOpenSticker,
}) {
  return (
    <TrophySection title={<TeamStickerTitle team={team} index={index} total={total} onPrevious={onPrevious} onNext={onNext} />}>
      <div className="mc-sticker-book-panel mc-panel-stack rounded-[1.35rem] border border-[#F5F1E8]/10 bg-[#031B12]/46 px-[clamp(0.45rem,2.5vw,0.75rem)] py-4 ring-1 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
        <div className="mc-sticker-book-grid grid grid-cols-3 items-stretch gap-[clamp(0.4rem,2.2vw,0.75rem)]">
          <StickerBookSlot
            label="WEAR THE SHIRT"
            team={team}
            stickerKey="kit"
            nationStickerProgress={nationStickerProgress}
            nationCupWins={nationCupWins}
            lockedTeam={lockedTeam}
            onOpenSticker={onOpenSticker}
          />
          <StickerBookSlot
            label="FLY THE FLAG"
            team={team}
            stickerKey="flag"
            nationStickerProgress={nationStickerProgress}
            nationCupWins={nationCupWins}
            lockedTeam={lockedTeam}
            onOpenSticker={onOpenSticker}
          />
          <StickerBookSlot
            label="LIFT THE CUP"
            team={team}
            stickerKey="champions"
            nationStickerProgress={nationStickerProgress}
            nationCupWins={nationCupWins}
            lockedTeam={lockedTeam}
            onOpenSticker={onOpenSticker}
          />
        </div>
        <div className="mc-sticker-book-grid grid grid-cols-3 gap-[clamp(0.4rem,2.2vw,0.75rem)]">
          {STICKER_ROLES.map((role) => (
            <StickerBookSlot
              key={role.key}
              label={role.label}
              role={role}
              team={team}
              stickerKey={role.key}
              nationStickerProgress={nationStickerProgress}
              nationCupWins={nationCupWins}
              lockedTeam={lockedTeam}
              onOpenSticker={onOpenSticker}
            />
          ))}
        </div>
      </div>
    </TrophySection>
  );
}

export function TrophyCabinetScreen({ menuProps, achievements = {}, nationCupWins = {}, nationStickerProgress = {}, careerStats = {}, allTeamsUnlocked = false, userTeam = null, onOpenNationSticker }) {
  const defaultTeamIndex = defaultTeamIndexFor(userTeam);
  const defaultTeam = ALL_NATIONS[defaultTeamIndex] || ALL_NATIONS[0];
  const [trophyView, setTrophyView] = useState("player");
  const [achievementPage, setAchievementPage] = useState(0);
  const [teamIndex, setTeamIndex] = useState(defaultTeamIndex);
  const [groupIndex, setGroupIndex] = useState(() => groupIndexForTeam(defaultTeam));

  const playerAchievementPages = [
    buildCareerHighlightPage(careerStats, achievements, nationCupWins),
    ...buildPlayerAchievementPages(careerStats, achievements),
  ];
  const safeAchievementPageCount = Math.max(1, playerAchievementPages.length || ACHIEVEMENT_PAGE_COUNT);
  const activeAchievementPage = playerAchievementPages[achievementPage % safeAchievementPageCount] || playerAchievementPages[0];
  const visibleAchievements = activeAchievementPage?.rows || [];
  const previousAchievementPage = () => setAchievementPage((page) => (page - 1 + safeAchievementPageCount) % safeAchievementPageCount);
  const nextAchievementPage = () => setAchievementPage((page) => (page + 1) % safeAchievementPageCount);
  const selectTeamByIndex = (nextIndex) => {
    const safeIndex = (nextIndex + ALL_NATIONS.length) % ALL_NATIONS.length;
    const nextTeam = ALL_NATIONS[safeIndex] || ALL_NATIONS[0];
    setTeamIndex(safeIndex);
    setGroupIndex(groupIndexForTeam(nextTeam));
  };
  const selectGroupByIndex = (nextIndex) => {
    const safeIndex = (nextIndex + GROUP_KEYS.length) % GROUP_KEYS.length;
    const nextGroupKey = GROUP_KEYS[safeIndex] || GROUP_KEYS[0];
    const firstTeamInGroup = GROUPS[nextGroupKey]?.[0] || ALL_NATIONS[0];
    setGroupIndex(safeIndex);
    setTeamIndex(Math.max(0, ALL_NATIONS.indexOf(firstTeamInGroup)));
  };
  const previousTeam = () => selectTeamByIndex(teamIndex - 1);
  const nextTeam = () => selectTeamByIndex(teamIndex + 1);
  const previousGroup = () => selectGroupByIndex(groupIndex - 1);
  const nextGroup = () => selectGroupByIndex(groupIndex + 1);
  const handleTrophyViewChange = (nextView) => {
    setTrophyView(nextView);
    if (nextView === "teams") selectTeamByIndex(defaultTeamIndex);
  };
  const selectTeam = (team) => {
    const nextIndex = ALL_NATIONS.indexOf(team);
    if (nextIndex >= 0) selectTeamByIndex(nextIndex);
  };
  useEffect(() => {
    if (trophyView !== "teams") {
      setTeamIndex(defaultTeamIndex);
      setGroupIndex(groupIndexForTeam(defaultTeam));
    }
  }, [defaultTeam, defaultTeamIndex, trophyView]);

  const activeTeam = ALL_NATIONS[teamIndex] || ALL_NATIONS[0];
  const activeTeamLocked = !teamIsPurchased(activeTeam, allTeamsUnlocked);
  const activeGroupKey = GROUP_KEYS[groupIndex] || GROUP_KEYS[0];
  const activeGroupTeams = GROUPS[activeGroupKey] || [];

  return (
    <main className="relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>TROPHIES</ScreenTopBar>
      <PageTabsSlot>
        <TrophyToggle value={trophyView} onChange={handleTrophyViewChange} />
      </PageTabsSlot>
      <PageScroll className="pt-1">
        <div className="mc-panel-stack pb-4">
          {trophyView === "player" && (
            <>
              <AchievementRatingPanel careerStats={careerStats} />
              <TrophySection title={<AchievementSectionTitle title={activeAchievementPage?.title || "PLAYER"} pageNumber={(achievementPage % safeAchievementPageCount) + 1} pageCount={safeAchievementPageCount} onPrevious={previousAchievementPage} onNext={nextAchievementPage} />}>
                <div className="grid gap-2.5">
                  {visibleAchievements.map((achievement, index) => (
                    <AchievementRow
                      key={achievement.key}
                      item={achievement}
                      number={index + 1}
                    />
                  ))}
                </div>
              </TrophySection>
            </>
          )}

          {trophyView === "teams" && (
            <>
              <GroupFlagWall
                groupKey={activeGroupKey}
                teams={activeGroupTeams}
                activeTeam={activeTeam}
                onPrevious={previousGroup}
                onNext={nextGroup}
                onSelectTeam={selectTeam}
                nationStickerProgress={nationStickerProgress}
                nationCupWins={nationCupWins}
                allTeamsUnlocked={allTeamsUnlocked}
              />
              <TeamStickerBook
                team={activeTeam}
                index={teamIndex}
                total={ALL_NATIONS.length}
                onPrevious={previousTeam}
                onNext={nextTeam}
                nationStickerProgress={nationStickerProgress}
                nationCupWins={nationCupWins}
                lockedTeam={activeTeamLocked}
                onOpenSticker={onOpenNationSticker}
              />
            </>
          )}
        </div>
      </PageScroll>
    </main>
  );
}
