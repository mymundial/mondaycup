import { useState } from "react";
import { auth } from "../../firebase.js";
import { LEADERBOARD_POINTS } from "../../logic/leaderboardScoring.js";
import { formForSummary, conversionPercent } from "../../logic/appState.js";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { AuthMenuPanel } from "../layout/Menu.jsx";
import { MenuPanel, IvoryCard, UserHighlightCard } from "../layout/MenuPanel.jsx";
import { ActionButton } from "../layout/ActionButton.jsx";
import { Flag } from "../shared.jsx";
import PageTabs, { PageTabsSlot } from "../ui/PageTabs.jsx";
import PageScroll from "../ui/PageScroll.jsx";
import TeamFlag from "../ui/TeamFlag.jsx";
import AppPanel, { appPanelStyleForVariant } from "../ui/AppPanel.jsx";
import { getTeamDisplayName } from "../ui/TeamName.jsx";
import { normaliseTicketQuantity } from "../../data/storeItems.js";
import { GROUPS } from "../../data/teams.js";
import { ShirtPosterPreview } from "../share/SharePreviews.jsx";

const ALL_NATIONS = Object.values(GROUPS).flat();

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

function PodiumBadgeCard({ unlocked, title, assetSrc, placeholderSrc, podiumClass = "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18" }) {
  return (
    <div className={`grid h-[112px] min-h-[112px] grid-rows-[70px_auto] place-items-center rounded-[1.25rem] border px-2.5 py-3 text-center ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_7px_14px_rgba(0,0,0,0.12)] ${podiumClass}`}>
      <div className="flex h-[70px] w-full items-center justify-center overflow-hidden">
        <img src={unlocked ? assetSrc : placeholderSrc} alt="" className="h-[58px] w-[58px] max-h-[58px] max-w-[58px] object-contain" />
      </div>
      <div className="home-copy-bold mt-1 text-[9px] uppercase leading-none tracking-[0.11em] text-[#072D1D]">{title}</div>
    </div>
  );
}

function NationFlagTile({ team, unlocked }) {
  const displayName = getTeamDisplayName(team, "flagWall");
  return (
    <div className={`grid min-w-0 place-items-center justify-items-center rounded-[1.05rem] border px-1.5 py-1.5 text-center ring-1 ${unlocked ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/16" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`}>
      <div className={`mx-auto flex h-[24px] w-[36px] shrink-0 items-center justify-center justify-self-center overflow-hidden rounded-[0.4rem] ${unlocked ? "ring-1 ring-[#F7D117]/55" : "opacity-35 saturate-0 brightness-[0.78]"}`}>
        <Flag team={team} className="block h-[24px] w-[36px] rounded-[0.4rem] object-cover" />
      </div>
      <div className={`mt-1 block w-full min-w-0 max-w-full truncate text-center home-copy-bold text-[5.8px] uppercase leading-tight tracking-[0.08em] ${unlocked ? "text-[#F7D117]" : "text-[#0B5F35]/56"}`}>{displayName}</div>
    </div>
  );
}

function TrophyToggle({ value, onChange }) {
  return (
    <PageTabs
      value={value}
      onChange={onChange}
      options={[
        { value: "badges", label: "BADGES" },
        { value: "flagWall", label: "FLAGS" },
      ]}
    />
  );
}

function TrophySection({ title, children }) {
  return (
    <AppPanel variant="table" maxWidth="94%" radius="1.6rem" className="text-[#F5F1E8]">
      {title && (
        <div className="px-4 pb-5 pt-4 text-center home-copy-bold text-[23px] uppercase leading-none tracking-[0.09em] text-[#F5F1E8]">
          {title}
        </div>
      )}
      <div className={title ? "px-3.5 pb-4" : "px-3.5 py-4"}>{children}</div>
    </AppPanel>
  );
}

function TrophyCount({ children }) {
  return <div className="pt-2 text-center home-copy-bold text-[10px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">{children}</div>;
}

function TrophyProgressMeter({ unlocked = 0, total = 27 }) {
  const safeTotal = Math.max(1, Number(total || 27));
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

function AchievementArrowButton({ direction, onClick }) {
  return <button type="button" onClick={onClick} className="flex h-8 w-8 items-center justify-center text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]" aria-label={direction === "left" ? "Previous achievements" : "Next achievements"}><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{direction === "left" ? <path d="M15 5L8 12L15 19" /> : <path d="M9 5L16 12L9 19" />}</svg></button>;
}

function AchievementSectionTitle({ onPrevious, onNext }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
      <AchievementArrowButton direction="left" onClick={onPrevious} />
      <span>ACHIEVEMENTS</span>
      <AchievementArrowButton direction="right" onClick={onNext} />
    </div>
  );
}


const ACHIEVEMENT_PLACEHOLDER_SRC = "/assets/badges/gold_shield.png";
const ACHIEVEMENT_TROPHY_SRC = "/assets/badges/mc-trophy.png";

function AchievementIcon({ unlocked }) {
  const sizeClass = unlocked ? "h-[46px] w-[46px]" : "h-[50px] w-[50px]";

  return (
    <div className="flex h-[58px] w-[58px] items-center justify-center bg-transparent">
      <img
        src={unlocked ? ACHIEVEMENT_TROPHY_SRC : ACHIEVEMENT_PLACEHOLDER_SRC}
        alt=""
        className={`block ${sizeClass} bg-transparent object-contain shadow-none drop-shadow-none`}
        draggable={false}
      />
    </div>
  );
}

function SvgTrophyCard({ title, description, unlocked, number }) {
  return (
    <div className={`relative flex min-h-[112px] flex-col items-center justify-center rounded-[1.1rem] border px-1.5 py-2 text-center ring-1 ${unlocked ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/16" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`}>
      <div className={`absolute left-3 top-2 home-copy-bold font-black text-[7px] uppercase leading-none tracking-[0.08em] ${unlocked ? "text-[#F7D117]/90" : "text-[#0B5F35]/58"}`}>#{number}</div>
      <AchievementIcon unlocked={unlocked} />
      <div className={`home-copy-bold mt-1.5 text-[8px] uppercase leading-none tracking-[0.12em] ${unlocked ? "text-[#F7D117]" : "text-[#0B5F35]"}`}>{title}</div>
      <div className={`mt-1 max-w-full truncate home-copy-regular text-[5.5px] uppercase leading-none tracking-[0.08em] ${unlocked ? "text-[#F5F1E8]/70" : "text-[#0B5F35]/58"}`}>{description}</div>
    </div>
  );
}

export function TrophyCabinetScreen({ menuProps, achievements = {}, nationCupWins = {} }) {
  const [trophyView, setTrophyView] = useState("badges");
  const [achievementPage, setAchievementPage] = useState(0);
  const completedCount = ALL_NATIONS.filter((team) => nationCupWins?.[team]?.unlocked).length;
  const svgTrophies = [
    { key: "ourTime", title: "Our Time", description: "Start as a host" },
    { key: "kickOff", title: "Kick Off", description: "Complete one match" },
    { key: "woodwork", title: "Woodwork", description: "Hit post or bar" },
    { key: "targetMan", title: "Target Man", description: "Score first goal" },
    { key: "ptsOnTheBoard", title: "PTS On The Board", description: "Earn group points" },
    { key: "victory", title: "Victory", description: "Win first match" },
    { key: "cleanSweep", title: "Clean Sweep", description: "Win all groups" },
    { key: "qualified", title: "Qualified", description: "Escape the group" },
    { key: "tko", title: "TKO", description: "Win R32" },
    { key: "quarterFinalist", title: "Quarter-Finalist", description: "Win R16" },
    { key: "semiFinalist", title: "Semi-Finalist", description: "Win QF" },
    { key: "finalist", title: "Finalist", description: "Win SF" },
    { key: "cleanSheet", title: "Clean Sheet", description: "Concede zero" },
    { key: "perfect", title: "Perfect", description: "Score all pens" },
    { key: "comebackKing", title: "Comeback King", description: "Win from behind" },
    { key: "iceCold", title: "Ice Cold", description: "Win sudden death" },
    { key: "goldenTouch", title: "Golden Touch", description: "Win with cosmetic" },
    { key: "corruptionScandal", title: "Corruption Scandal", description: "Use Golden Ticket" },
    { key: "mondayLegend", title: "Monday Legend", description: "Win 5 cups" },
    { key: "invincible", title: "Invincible", description: "Win all 8 matches" },
    { key: "nationalTreasure", title: "National Treasure", description: "Collect podium" },
    { key: "globalIcon", title: "Global Icon", description: "Complete flag wall", unlocked: completedCount >= ALL_NATIONS.length || Boolean(achievements?.globalIcon) },
    { key: "siuuu", title: "SIUUU!", description: "Score 1000 goals" },
    { key: "goat", title: "G.O.A.T.", description: "Collect all trophies" },
  ].map((item) => ({ ...item, unlocked: item.unlocked ?? Boolean(achievements?.[item.key]) }));
  const achievementsPerPage = 6;
  const achievementPageCount = Math.ceil(svgTrophies.length / achievementsPerPage);
  const visibleAchievements = svgTrophies.slice(achievementPage * achievementsPerPage, achievementPage * achievementsPerPage + achievementsPerPage);
  const achievementUnlockedCount = svgTrophies.filter((item) => item.unlocked).length;
  const podiumUnlockedCount = PODIUM_BADGES.filter((badge) => Boolean(achievements?.[badge.key])).length;
  const previousAchievementPage = () => setAchievementPage((page) => (page - 1 + achievementPageCount) % achievementPageCount);
  const nextAchievementPage = () => setAchievementPage((page) => (page + 1) % achievementPageCount);

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
              <TrophySection title={<AchievementSectionTitle onPrevious={previousAchievementPage} onNext={nextAchievementPage} />}>
                <div className="grid grid-cols-3 gap-3">
                  {visibleAchievements.map((trophy, index) => <SvgTrophyCard key={trophy.key} {...trophy} number={(achievementPage * achievementsPerPage) + index + 1} />)}
                </div>
                <TrophyCount>{achievementUnlockedCount}/{svgTrophies.length}</TrophyCount>
              </TrophySection>
              <TrophySection title={null}>
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
                total={svgTrophies.length + PODIUM_BADGES.length}
              />
            </>
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
