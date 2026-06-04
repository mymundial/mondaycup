import { useState } from "react";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { Flag } from "../shared.jsx";
import PageTabs, { PageTabsSlot } from "../ui/PageTabs.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import AppPanel from "../ui/AppPanel.jsx";
import { getTeamDisplayName } from "../ui/TeamName.jsx";
import { GROUPS, getTeamTheme, teamCode } from "../../data/teams.js";

const ALL_NATIONS = Object.values(GROUPS).flat();
const ACHIEVEMENTS_PER_PAGE = 6;
const ACHIEVEMENT_PAGE_COUNT = 10;
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

const DEMO_SHINY_NATION = "Mexico";

const STICKER_ROLES = [
  { key: "captain", label: "Captain Fantastic" },
  { key: "striker", label: "Star Striker" },
  { key: "stopper", label: "Shot Stopper" },
];

function TrophyToggle({ value, onChange }) {
  return (
    <PageTabs
      value={value}
      onChange={onChange}
      options={[
        { value: "badges", label: "BADGES" },
        { value: "teams", label: "TEAMS" },
        { value: "flagWall", label: "FLAGS" },
      ]}
    />
  );
}

function TrophySection({ title, children }) {
  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.6rem" className="text-[#F5F1E8]">
      {title && (
        <div className="px-4 pb-4 pt-4 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">
          {title}
        </div>
      )}
      <div className={title ? "px-3.5 pb-4" : "px-3.5 py-4"}>{children}</div>
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

function AchievementSectionTitle({ pageNumber, pageCount, onPrevious, onNext }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
      <ArrowButton direction="left" onClick={onPrevious} ariaLabel="Previous achievements" />
      <div className="grid gap-1">
        <span>ACHIEVEMENTS</span>
        <span className="home-copy-bold text-[8px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]/64">
          Page {pageNumber}/{pageCount}
        </span>
      </div>
      <ArrowButton direction="right" onClick={onNext} ariaLabel="Next achievements" />
    </div>
  );
}

function AchievementCheck({ unlocked }) {
  return (
    <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[0.75rem] border ${unlocked ? "border-[#F7D117] bg-[#F7D117] text-[#062819] shadow-[0_0_12px_rgba(247,209,23,0.28)]" : "border-[#F5F1E8]/18 bg-[#021A11]/24 text-transparent"}`}>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5L10 17.5L19 6.5" />
      </svg>
    </div>
  );
}

function LockedAchievementIcon() {
  return (
    <div className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#F5F1E8]/14 bg-[#031B12]/40 ring-1 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
      <div className="absolute inset-[7px] rounded-full border border-[#F5F1E8]/14" aria-hidden="true" />
      <svg viewBox="0 0 24 24" className="h-[24px] w-[24px] text-[#F5F1E8]/34" fill="currentColor" aria-hidden="true">
        <path d="M12 2.4l2.65 5.65 6.2.78-4.55 4.28 1.16 6.13L12 16.22 6.54 19.24 7.7 13.1 3.15 8.83l6.2-.78L12 2.4z" />
      </svg>
    </div>
  );
}

function AchievementRewardIcon({ unlocked }) {
  if (unlocked) {
    return (
      <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#F7D117]/46 bg-[#031B12]/42 ring-1 ring-[#F7D117]/24 shadow-[0_0_12px_rgba(247,209,23,0.18)]">
        <img src={ACHIEVEMENT_UNLOCKED_SRC} alt="" className="h-[46px] w-[46px] object-contain" draggable={false} />
      </div>
    );
  }

  return <LockedAchievementIcon />;
}

function AchievementRow({ item, number }) {
  const unlocked = Boolean(item.unlocked);
  return (
    <div className={`grid min-h-[74px] grid-cols-[48px_minmax(0,1fr)_64px] items-center gap-3 rounded-[1.25rem] border px-3 py-2 ring-1 transition-all ${unlocked ? "border-[#F7D117]/78 bg-[#063B23]/78 text-[#F5F1E8] ring-[#F7D117]/22 shadow-[0_0_14px_rgba(247,209,23,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]" : "border-[#F5F1E8]/14 bg-[#031B12]/46 text-[#F5F1E8] ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"}`}>
      <AchievementCheck unlocked={unlocked} />
      <div className="min-w-0 text-left">
        <div className={`home-copy-bold text-[15px] uppercase leading-none tracking-[0.08em] ${unlocked ? "text-[#F7D117]" : "text-[#F5F1E8]"}`}>
          {item.title}
        </div>
        <div className="mt-1.5 home-copy-regular text-[7px] uppercase leading-none tracking-[0.13em] text-[#F5F1E8]/56">
          #{String(number).padStart(2, "0")} · {item.description}
        </div>
      </div>
      <div className="justify-self-end">
        <AchievementRewardIcon unlocked={unlocked} />
      </div>
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

function NationFlagTile({ team, unlocked }) {
  const displayName = getTeamDisplayName(team, "flagWall");
  return (
    <div className={`grid min-w-0 place-items-center justify-items-center rounded-[1.05rem] border px-1.5 py-1.5 text-center ring-1 ${unlocked ? "border-[#F7D117]/40 bg-[#052D1D]/84 text-[#F5F1E8] ring-[#F7D117]/20" : "border-[#F5F1E8]/14 bg-[#052D1D]/58 text-[#F5F1E8] ring-[#F5F1E8]/10"}`}>
      <div className={`mx-auto flex h-[24px] w-[36px] shrink-0 items-center justify-center justify-self-center overflow-hidden rounded-[0.4rem] ${unlocked ? "ring-1 ring-[#F7D117]/55" : "opacity-35 saturate-0 brightness-[0.78]"}`}>
        <Flag team={team} className="block h-[24px] w-[36px] rounded-[0.4rem] object-cover" />
      </div>
      <div className={`mt-1 block w-full min-w-0 max-w-full truncate text-center home-copy-bold text-[5.8px] uppercase leading-tight tracking-[0.08em] ${unlocked ? "text-[#F7D117]" : "text-[#F5F1E8]/56"}`}>{displayName}</div>
    </div>
  );
}

function TeamStickerTitle({ team, index, total, onPrevious, onNext }) {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2">
      <ArrowButton direction="left" onClick={onPrevious} ariaLabel="Previous team" />
      <div className="min-w-0 text-center">
        <div className="truncate home-copy-bold text-[22px] uppercase leading-none tracking-[0.1em] text-[#F5F1E8]">
          {getTeamDisplayName(team, "title")}
        </div>
        <div className="mt-1 home-copy-bold text-[8px] uppercase leading-none tracking-[0.14em] text-[#F5F1E8]/64">
          Team {index + 1}/{total}
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
  const baseClass = featured ? "h-[76px] w-[132px] rounded-[1.05rem]" : "h-[58px] w-[62px] rounded-[0.95rem]";
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
    <div className={`${baseClass} relative z-[2] flex items-center justify-center border border-[#F5F1E8]/16 bg-[#0B6B3A]/26 text-[#F5F1E8]/34 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]`}>
      <span className="home-copy-bold text-[32px] uppercase leading-none tracking-[0.04em]">?</span>
    </div>
  );
}

function StickerShineOverlay({ shiny }) {
  if (!shiny) return null;
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[1] monday-sticker-sparkle-noise opacity-72 mix-blend-screen" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 z-[1] monday-sticker-rainbow-shine opacity-78 mix-blend-screen" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-[6px] z-[1] rounded-[inherit] border border-white/34 opacity-78 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-[12px] z-[1] rounded-[1rem] border border-[#F7D117]/22 opacity-52"
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
    <div className={`relative flex ${crestSize} items-center justify-center drop-shadow-[0_10px_18px_rgba(0,0,0,0.34)]`}>
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
        <div className={`${flagSize} overflow-hidden rounded-[0.35rem] border border-white/50 bg-black/20 shadow-[0_4px_9px_rgba(0,0,0,0.20)]`}>
          <Flag team={team} className="h-full w-full object-cover" />
        </div>
        <div className={`home-copy-bold ${codeSize} uppercase leading-none tracking-[0.11em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.48)]`}>
          {code}
        </div>
      </div>
    </div>
  );
}

function OpenStickerContent({ label, team, featured = false, shiny = false }) {
  const theme = getTeamTheme(team);
  const textColor = shiny ? "#FFFFFF" : theme.text || "#F5F1E8";
  const glow = shiny ? "drop-shadow-[0_2px_6px_rgba(0,0,0,0.52)]" : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.34)]";
  const displayName = getTeamDisplayName(team, "sticker");

  if (featured && shiny) {
    return (
      <div className="relative z-[2] grid h-full w-full grid-rows-[1fr_auto] items-center justify-items-center px-3 py-2.5 text-center">
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="absolute left-1 top-1 rounded-full border border-white/38 bg-black/18 px-2.5 py-1 home-copy-bold text-[8px] uppercase leading-none tracking-[0.16em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            Foil
          </div>
          <div className="absolute right-1 top-1 rounded-full border border-[#F7D117]/50 bg-black/18 px-2 py-1 home-copy-bold text-[8px] uppercase leading-none tracking-[0.12em] text-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.12)]">
            ★
          </div>
          <ShinyStickerCrest team={team} featured />
        </div>
        <div className="grid w-full max-w-[255px] grid-cols-[1fr_auto] items-center gap-2 rounded-[0.45rem] border border-white/42 bg-black/24 px-3 py-1.5 shadow-[0_7px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.20)]">
          <div className="truncate text-left home-copy-bold text-[17px] uppercase leading-none tracking-[0.11em] text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)]">
            {displayName}
          </div>
          <div className="home-copy-bold text-[8px] uppercase leading-none tracking-[0.16em] text-[#F7D117] drop-shadow-[0_2px_4px_rgba(0,0,0,0.42)]">
            {teamCode(team)}
          </div>
        </div>
      </div>
    );
  }

  if (featured) {
    return (
      <div className="relative z-[2] grid h-full w-full grid-cols-[minmax(0,1fr)_112px] items-center gap-3 px-3 py-2">
        <div className="min-w-0 text-left">
          <div className={`truncate home-copy-bold text-[21px] uppercase leading-none tracking-[0.1em] ${glow}`} style={{ color: textColor }}>
            {displayName}
          </div>
          <div className="mt-1.5 home-copy-bold text-[8px] uppercase leading-none tracking-[0.14em] opacity-78" style={{ color: textColor }}>
            Nation Flag
          </div>
        </div>
        <div className="flex h-[72px] w-[112px] items-center justify-center overflow-hidden rounded-[0.85rem] border border-white/38 bg-black/18 shadow-[0_8px_18px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.28)]">
          <Flag team={team} className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  if (shiny) {
    return (
      <div className="relative z-[2] flex h-full w-full flex-col items-center justify-between px-2.5 py-3 text-center">
        <div className="home-copy-bold text-[7px] uppercase leading-tight tracking-[0.13em] text-white/88 drop-shadow-[0_2px_4px_rgba(0,0,0,0.42)]">
          {label}
        </div>
        <ShinyStickerCrest team={team} />
        <div className="rounded-full border border-white/30 bg-black/20 px-2 py-0.5 home-copy-bold text-[6.5px] uppercase leading-none tracking-[0.14em] text-[#F7D117] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
          Foil
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[2] flex h-full w-full flex-col items-center justify-between px-2.5 py-3 text-center">
      <div className="home-copy-bold text-[8px] uppercase leading-tight tracking-[0.13em] opacity-82" style={{ color: textColor }}>
        {label}
      </div>
      <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/28 bg-black/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        <span className="home-copy-bold text-[24px] uppercase leading-none tracking-[0.06em]" style={{ color: textColor }}>
          ★
        </span>
      </div>
      <div className="home-copy-bold text-[7px] uppercase leading-none tracking-[0.12em] opacity-78" style={{ color: textColor }}>
        Sticker
      </div>
    </div>
  );
}

function StickerBookSlot({
  label,
  team,
  stickerKey,
  featured = false,
  nationStickerProgress = {},
  nationCupWins = {},
  onOpenSticker,
}) {
  const record = getStickerRecord(nationStickerProgress, team);
  const demoShiny = team === DEMO_SHINY_NATION;
  const cupWon = Boolean(demoShiny || record?.cupWon || nationCupWins?.[team]?.unlocked);
  const played = Boolean(cupWon || record?.played || Number(record?.matchesPlayed || 0) > 0);
  const opened = Boolean(cupWon || stickerHasOpened(record, stickerKey));
  const claimable = Boolean(!opened && (record?.claimable?.[stickerKey] || (stickerKey === "flag" && played)));
  const locked = !opened && !claimable;
  const style = buildStickerStyle({ team, shiny: cupWon, opened });
  const innerRadius = featured ? "rounded-[1.05rem]" : "rounded-[0.9rem]";

  return (
    <div
      className={`relative flex flex-col items-center justify-between overflow-hidden rounded-[1.25rem] border text-center ring-1 transition-all ${
        opened
          ? "border-[#F5F1E8]/42 bg-[#052D1D]/72 ring-[#F7D117]/26"
          : claimable
            ? "border-[#F7D117]/82 bg-[#052D1D]/72 ring-[#F7D117]/28 shadow-[0_0_16px_rgba(247,209,23,0.12)]"
            : "border-[#F5F1E8]/16 bg-[#F5F1E8]/[0.055] ring-[#F5F1E8]/10"
      } ${cupWon && opened ? "monday-sticker-shiny-shell" : ""} ${featured ? "mx-auto aspect-[16/9] w-full max-w-[330px] p-3" : "aspect-[3/4] p-2.5"}`}
      style={style}
    >
      <StickerShineOverlay shiny={cupWon && opened} />
      {!opened && (
        <>
          <div className={`absolute inset-2 ${innerRadius} border border-dashed ${claimable ? "border-[#F7D117]/42" : "border-[#F5F1E8]/14"}`} aria-hidden="true" />
          <div className="relative z-[2] mt-1 home-copy-bold text-[8px] uppercase leading-tight tracking-[0.13em] text-[#F5F1E8]/72">
            {label}
          </div>
          <StickerQuestionBox
            claimable={claimable}
            featured={featured}
            onOpen={() => onOpenSticker?.(team, stickerKey)}
          />
          <div className={`relative z-[2] mb-1 home-copy-bold text-[7px] uppercase leading-none tracking-[0.12em] ${claimable ? "text-[#F7D117]" : "text-[#F5F1E8]/36"}`}>
            {claimable ? "Tap to open" : locked ? "Locked" : "Sticker"}
          </div>
        </>
      )}
      {opened && <OpenStickerContent label={label} team={team} featured={featured} shiny={cupWon} />}
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
  onOpenSticker,
}) {
  return (
    <TrophySection title={<TeamStickerTitle team={team} index={index} total={total} onPrevious={onPrevious} onNext={onNext} />}>
      <div className="space-y-4 rounded-[1.35rem] border border-[#F5F1E8]/10 bg-[#031B12]/30 px-3 py-4 ring-1 ring-[#F5F1E8]/8 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
        <StickerBookSlot
          label="Nation Flag"
          team={team}
          stickerKey="flag"
          featured
          nationStickerProgress={nationStickerProgress}
          nationCupWins={nationCupWins}
          onOpenSticker={onOpenSticker}
        />
        <div className="grid grid-cols-3 gap-2.5">
          {STICKER_ROLES.map((role) => (
            <StickerBookSlot
              key={role.key}
              label={role.label}
              team={team}
              stickerKey={role.key}
              nationStickerProgress={nationStickerProgress}
              nationCupWins={nationCupWins}
              onOpenSticker={onOpenSticker}
            />
          ))}
        </div>
      </div>
    </TrophySection>
  );
}

export function TrophyCabinetScreen({ menuProps, achievements = {}, nationCupWins = {}, nationStickerProgress = {}, onOpenNationSticker }) {
  const [trophyView, setTrophyView] = useState("badges");
  const [achievementPage, setAchievementPage] = useState(0);
  const [teamIndex, setTeamIndex] = useState(0);

  const completedCount = ALL_NATIONS.filter((team) => nationCupWins?.[team]?.unlocked).length;
  const achievementRows = ACHIEVEMENT_ROWS.map((item) => ({
    ...item,
    unlocked: item.key === "globalIcon"
      ? completedCount >= ALL_NATIONS.length || Boolean(achievements?.globalIcon)
      : Boolean(achievements?.[item.key]),
  }));
  const visibleAchievements = achievementRows.slice(
    achievementPage * ACHIEVEMENTS_PER_PAGE,
    achievementPage * ACHIEVEMENTS_PER_PAGE + ACHIEVEMENTS_PER_PAGE,
  );
  const achievementUnlockedCount = achievementRows.filter((item) => item.unlocked).length;
  const podiumUnlockedCount = PODIUM_BADGES.filter((badge) => Boolean(achievements?.[badge.key])).length;
  const previousAchievementPage = () => setAchievementPage((page) => (page - 1 + ACHIEVEMENT_PAGE_COUNT) % ACHIEVEMENT_PAGE_COUNT);
  const nextAchievementPage = () => setAchievementPage((page) => (page + 1) % ACHIEVEMENT_PAGE_COUNT);
  const previousTeam = () => setTeamIndex((index) => (index - 1 + ALL_NATIONS.length) % ALL_NATIONS.length);
  const nextTeam = () => setTeamIndex((index) => (index + 1) % ALL_NATIONS.length);
  const activeTeam = ALL_NATIONS[teamIndex] || ALL_NATIONS[0];

  return (
    <main className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden text-[#F5F1E8]">
      <ScreenTopBar {...menuProps}>TROPHIES</ScreenTopBar>
      <PageTabsSlot>
        <TrophyToggle value={trophyView} onChange={setTrophyView} />
      </PageTabsSlot>
      <PageScroll className="pt-0.5">
        <div className="space-y-2.5 pb-4">
          {trophyView === "badges" && (
            <>
              <TrophySection title={<AchievementSectionTitle pageNumber={achievementPage + 1} pageCount={ACHIEVEMENT_PAGE_COUNT} onPrevious={previousAchievementPage} onNext={nextAchievementPage} />}>
                <div className="grid gap-2.5">
                  {visibleAchievements.map((achievement, index) => (
                    <AchievementRow
                      key={achievement.key}
                      item={achievement}
                      number={(achievementPage * ACHIEVEMENTS_PER_PAGE) + index + 1}
                    />
                  ))}
                </div>
                <TrophyCount>{achievementUnlockedCount}/{achievementRows.length}</TrophyCount>
              </TrophySection>
              <TrophySection title="PODIUM BADGES">
                <div className="grid grid-cols-3 gap-3">
                  {PODIUM_BADGES.map((badge) => (
                    <PodiumBadgeCard
                      key={badge.key}
                      unlocked={Boolean(achievements?.[badge.key])}
                      title={badge.title}
                      assetSrc={badge.assetSrc}
                      placeholderSrc={badge.placeholderSrc}
                      podiumClass={badge.podiumClass}
                    />
                  ))}
                </div>
              </TrophySection>
              <TrophyProgressMeter
                unlocked={achievementUnlockedCount + podiumUnlockedCount}
                total={achievementRows.length + PODIUM_BADGES.length}
              />
            </>
          )}

          {trophyView === "teams" && (
            <TeamStickerBook
              team={activeTeam}
              index={teamIndex}
              total={ALL_NATIONS.length}
              onPrevious={previousTeam}
              onNext={nextTeam}
              nationStickerProgress={nationStickerProgress}
              nationCupWins={nationCupWins}
              onOpenSticker={onOpenNationSticker}
            />
          )}

          {trophyView === "flagWall" && (
            <TrophySection title="FLAG WALL">
              <div className="grid grid-cols-6 justify-items-stretch gap-2.5">
                {ALL_NATIONS.map((nation) => (
                  <NationFlagTile key={nation} team={nation} unlocked={Boolean(nationCupWins?.[nation]?.unlocked)} />
                ))}
              </div>
              <TrophyCount>{completedCount}/{ALL_NATIONS.length}</TrophyCount>
            </TrophySection>
          )}
        </div>
      </PageScroll>
    </main>
  );
}
