import { useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../firebase";
import { HOST_TEAMS, GROUPS, GROUP_LETTERS, TEAM_RANK, getTeamTheme } from "../../data/teams.js";
import { ASSETS } from "../../data/assets.js";
import { Flag } from "../shared.jsx";
import { ensureUserDocument } from "../../lib/firebaseUser.js";
import { GreenCard, SelectionLayout, Shell } from "../layout/Layout.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import SharedCrowdBackdrop from "../crowd/SharedCrowdBackdrop.jsx";
import { AuthEmailCommsCheckbox, AuthForgotPasswordButton, AuthPrimaryButton, AuthTabs, AuthTextInput, PasswordVisibilityButton } from "../auth/AuthFormParts.jsx";
import { MC_SELECTION_LAYOUT, mcSoftPanelStyle } from "../../styles/theme.js";
import "./FlashTeamTicker.css";

const GAME = {
  goal: {
    left: MC_SELECTION_LAYOUT.goalLeftPercent,
    top: MC_SELECTION_LAYOUT.goalTopPercent,
    width: MC_SELECTION_LAYOUT.goalWidthPercent,
    height: MC_SELECTION_LAYOUT.goalHeightPercent,
  },
  spot: { x: MC_SELECTION_LAYOUT.penaltySpotXPercent, y: MC_SELECTION_LAYOUT.penaltySpotYPercent },
};

const MATCH_TOP_BAR_HEIGHT_PX = MC_SELECTION_LAYOUT.topBarHeight;
const MATCH_SCOREBOARD_RATIO = MC_SELECTION_LAYOUT.scoreboardRatio;
const SHARED_AD_BOARD_HEIGHT_PERCENT = MC_SELECTION_LAYOUT.adBoardHeightPercent;


const MONDAY_CUP_AD_SRC = "/assets/branding/mondaycup_co_uk.png";
const FLOATING_HOME_LOGO_SRC = ASSETS.branding.mondayLogo;
const SCOREBOARD_STAGE_TEXT = "font-led text-[clamp(9px,1.35vh,16px)] font-black uppercase leading-none tracking-[0.14em] text-[#F7D117]";
const SCOREBOARD_MAIN_TEXT = "font-led text-[clamp(17px,3.05vh,34px)] font-black uppercase leading-none tracking-normal text-[#F7D117]";
const SCOREBOARD_MARKER_TEXT = "font-led text-[clamp(6px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.12em] text-[#F7D117]";
const SCOREBOARD_LABEL_BOX_WIDTH = "clamp(272px,68vw,342px)";
const MENU_TITLE_CLASS = "home-copy-bold text-[28px] uppercase leading-none tracking-[0.07em] text-[#F5F1E8]";
const HOME_MAIN_HEIGHT = `calc(100dvh - (${MATCH_TOP_BAR_HEIGHT_PX}px + ((100dvh - ${MATCH_TOP_BAR_HEIGHT_PX}px) * ${MATCH_SCOREBOARD_RATIO})))`;
const HOME_LOGO_TOP_RATIO = 0;
const HOME_LOGO_TOP_PADDING = "clamp(18px,3vh,28px)";
const HOME_LOGO_HEIGHT = "min(165px,22vh)";
const HOME_LOGO_CENTER_Y = "17%";
const HOME_LOGO_GAP = "clamp(18px,2.6vh,30px)";
const HOME_AD_BOARD_TOP_PERCENT = GAME.goal.top + GAME.goal.height - SHARED_AD_BOARD_HEIGHT_PERCENT;
const HOME_GOAL_LINE_PERCENT = GAME.goal.top + GAME.goal.height;
const HOME_MENU_TOP_OFFSET = `calc(${HOME_GOAL_LINE_PERCENT}% + clamp(10px,1.4vh,16px))`;

function AtIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M16.1 8.1v5.2c0 1.2.7 2 1.8 2 1.5 0 2.6-1.6 2.6-3.6 0-4.7-3.4-8.2-8.2-8.2-5.2 0-8.8 3.8-8.8 8.8 0 5.1 3.8 8.2 8.9 8.2 1.7 0 3.2-.3 4.6-.9" />
    </svg>
  );
}

function PadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4s3.6 1.4 3.6 3.6V10" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function OpenPadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4c1.8 0 3.1 1.1 3.5 2.8" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function StarIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.75l2.72 5.52 6.1.89-4.41 4.3 1.04 6.07L12 16.66l-5.45 2.87 1.04-6.07-4.41-4.3 6.1-.89L12 2.75z" />
    </svg>
  );
}



function HomeCrowdPerson({ x, y, scale = 1, shirt = "#0d6c3d", skin = "#c98f65", pose = "down", opacity = 1 }) {
  const armLeft = pose === "up" ? "M5 13 L1 6" : "M5 13 L2 20";
  const armRight = pose === "up" ? "M13 13 L17 6" : "M13 13 L16 20";
  return (
    <svg className="absolute overflow-visible" style={{ left: `${x}%`, top: `${y}%`, width: `${18 * scale}px`, height: `${30 * scale}px`, opacity, transform: "translate(-50%, -50%)" }} viewBox="0 0 18 30" aria-hidden="true">
      <path d={armLeft} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <path d={armRight} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="6" r="4" fill={skin} />
      <rect x="4" y="11" width="10" height="12" rx="3" fill={shirt} />
      <rect x="5" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
      <rect x="10" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
    </svg>
  );
}

function HomeCrowdBackdrop() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = SHARED_AD_BOARD_HEIGHT_PERCENT;
  const boardTop = goalLine - boardHeight;
  const shirts = [
    "#2DA94F", "#F7D117", "#FF1E3C", "#FF3131", "#E1251B", "#2F3ED6", "#8A1538", "#E3000F",
    "#E10600", "#1A22C9", "#2A248A", "#F7C600", "#FF8A00", "#F7D900", "#FF8500", "#3131E8",
    "#FF1744", "#9B003F", "#F20D1B", "#25308F", "#7CB5E8", "#0D47A1", "#157A52", "#D50000",
    "#93BFEA", "#00A86B", "#FF3B30", "#1E7FF0", "#2437C6", "#FFFFFF"
  ];
  const skins = ["#c98f65", "#8f5f3f", "#e0b184", "#6f4632"];
  const makeRow = ({ count, startX, step, y, scale, opacity, stagger = 0, wave = 0, shirtOffset = 0, skinOffset = 0 }) => Array.from({ length: count }, (_, i) => ({
    x: startX + i * step + (i % 2 ? stagger : 0),
    y: y + (i % 3) * wave,
    scale,
    shirt: shirts[((i * 7) + shirtOffset) % shirts.length],
    skin: skins[(i + skinOffset) % skins.length],
    pose: i % 4 === 0 || i % 7 === 0 ? "up" : "down",
    opacity,
  }));
  const crowdRows = [
    ...makeRow({ count: 42, startX: 0.5, step: 2.35, y: 4, scale: 0.4, opacity: 0.18, stagger: 0.35, wave: 0.35 }),
    ...makeRow({ count: 38, startX: 1, step: 2.6, y: 9, scale: 0.46, opacity: 0.26, stagger: 0.45, wave: 0.4, shirtOffset: 1 }),
    ...makeRow({ count: 36, startX: 1.5, step: 2.85, y: 16, scale: 0.54, opacity: 0.34, stagger: 0.55, wave: 0.5, shirtOffset: 2, skinOffset: 1 }),
    ...makeRow({ count: 34, startX: 2, step: 3.05, y: 25, scale: 0.62, opacity: 0.42, stagger: 0.65, wave: 0.55, shirtOffset: 3, skinOffset: 2 }),
    ...makeRow({ count: 32, startX: 2.5, step: 3.25, y: 36, scale: 0.7, opacity: 0.54, stagger: 0.75, wave: 0.65, shirtOffset: 4, skinOffset: 1 }),
    ...makeRow({ count: 30, startX: 3, step: 3.45, y: 49, scale: 0.78, opacity: 0.66, stagger: 0.9, wave: 0.8, shirtOffset: 0, skinOffset: 3 }),
    ...makeRow({ count: 28, startX: 3.5, step: 3.75, y: 64, scale: 0.86, opacity: 0.8, stagger: 1, wave: 0.9, shirtOffset: 2, skinOffset: 0 }),
    ...makeRow({ count: 26, startX: 4, step: 4.05, y: 80, scale: 0.94, opacity: 0.92, stagger: 1.1, wave: 0.9, shirtOffset: 1, skinOffset: 2 }),
    ...makeRow({ count: 24, startX: 4.5, step: 4.35, y: 91, scale: 0.98, opacity: 1, stagger: 1.2, wave: 0.45, shirtOffset: 3, skinOffset: 1 }),
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden bg-[#123822]" style={{ height: `${boardTop}%` }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 6%, rgba(245,241,232,0.08), transparent 20%), radial-gradient(circle at 80% 8%, rgba(255,214,0,0.05), transparent 18%), linear-gradient(180deg, rgba(4,22,14,0.4), rgba(4,22,14,0.1))" }} />
      <div className="absolute inset-x-0 top-[5%] h-[10%] bg-[#0b2d1d]/12" />
      <div className="absolute inset-x-0 top-[18%] h-[11%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[33%] h-[12%] bg-[#0b2d1d]/12" />
      {crowdRows.map((person, index) => <HomeCrowdPerson key={index} {...person} />)}
    </div>
  );
}

function HomeUnifiedCrowdBackdrop() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  const boardTop = goalLine - boardHeight;

  return (
    <SharedCrowdBackdrop
      density={1}
      rowCount={16}
      className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden"
      style={{ height: `${boardTop}%` }}
    />
  );
}

function HomeLedAdvertisingHoard() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = SHARED_AD_BOARD_HEIGHT_PERCENT;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-t border-[#05150E] bg-[#072D1D] shadow-[0_-8px_24px_rgba(0,0,0,0.42)]" style={{ bottom: `${100 - goalLine}%`, height: `${boardHeight}%` }}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
      <div className="relative mx-auto flex h-full max-w-[61%] items-center justify-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5F1E8]/16 blur-xl" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[48%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F7D117]/12 blur-lg" aria-hidden="true" />
        <img src={MONDAY_CUP_AD_SRC} alt="Monday Cup" className="relative z-[1] h-[69%] w-full object-contain" style={{ opacity: 0.84, filter: "brightness(0.94) drop-shadow(0 0 9px rgba(245,241,232,0.20))" }} draggable={false} />
      </div>
    </div>
  );
}

function HomeGoalFrame() {
  const goal = GAME.goal;
  return (
    <div className="absolute z-[3] overflow-hidden border-[8px] border-b-0 border-[#f5f1e8] bg-[#0d6c3d]/30" style={{ left: `${goal.left}%`, top: `${goal.top}%`, width: `${goal.width}%`, height: `${goal.height}%` }}>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent 1.8%, rgba(245,241,232,0.18) 2.0%, transparent 2.2%), repeating-linear-gradient(180deg, transparent 0%, transparent 2.6%, rgba(245,241,232,0.16) 2.8%, transparent 3.1%), linear-gradient(135deg, transparent 0%, transparent 49%, rgba(245,241,232,0.08) 49.4%, transparent 50%)", backgroundSize: "100% 100%, 100% 100%, 8px 8px" }} />
    </div>
  );
}

function HomePitchBackdrop() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0d6c3d]">
      <HomeUnifiedCrowdBackdrop />
      <HomeLedAdvertisingHoard />
      <div className="absolute bottom-0 left-0 right-0" style={{ top: `${goalLine}%`, backgroundImage: "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))" }} />
      <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
      <div className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]" style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }} />
      <HomeGoalFrame />
      <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />
    </div>
  );
}


function HomeFlashTeamTicker({ scoreboardHeight, tickerHeight }) {
  const teams = useMemo(() => GROUP_LETTERS.flatMap((group) => GROUPS[group] || []), []);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % teams.length);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [teams.length]);

  const activeTeam = teams[activeIndex] || teams[0] || "Mexico";
  const theme = getTeamTheme(activeTeam);

  return (
    <div
      className="flash-team-ticker"
      style={{
        "--flash-team-bg": theme.bg,
        "--flash-team-text": theme.text,
        height: tickerHeight || `calc(${scoreboardHeight} * 0.26)`,
      }}
      aria-live="off"
    >
      <div className="flash-team-ticker__grid">
        <span className="flash-team-ticker__flag">
          <Flag team={activeTeam} className="flash-team-ticker__flag-img" />
        </span>
        <span className="flash-team-ticker__name">
          {activeTeam}
        </span>
        <span className="flash-team-ticker__rank">
          #{TEAM_RANK[activeTeam]}
        </span>
      </div>
    </div>
  );
}

function HomePenaltyMarkers() {
  return (
    <div className="flex w-full justify-center gap-[3px]">
      {Array.from({ length: 5 }).map((_, idx) => (
        <span key={idx} className="h-[6px] w-[6px] rounded-full bg-[#F7D117] shadow-[0_0_5px_rgba(247,209,23,0.42),0_0_9px_rgba(247,209,23,0.18)]" />
      ))}
    </div>
  );
}

function HomeLedGroupsTicker() {
  const groupsTicker = GROUP_LETTERS.map((group) => ({ label: `GROUP ${group}:`, teams: GROUPS[group] || [] }));
  return (
    <div className="absolute inset-x-0 top-0 z-[2] h-[26%] overflow-hidden bg-[#050505]">
      <style>{`
        @keyframes homeLedTickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-12.5%); }
        }
        .home-led-ticker-track { animation: homeLedTickerScroll 156s linear infinite; }
      `}</style>
      <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.24) 1px, transparent 1.8px)", backgroundSize: "6px 6px" }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,168,87,0.18),rgba(255,255,255,0.04),rgba(36,168,87,0.18))]" />
      <div className="relative flex h-full items-center overflow-hidden">
        <div className="home-led-ticker-track flex w-max items-center whitespace-nowrap will-change-transform">
          {Array.from({ length: 8 }).map((_, copy) => (
            <div key={copy} className="flex min-w-max shrink-0 items-center pr-24">
              {groupsTicker.map(({ label, teams }) => (
                <span key={`${copy}-${label}`} className="font-led flex items-center text-[clamp(9px,1.35vh,15px)] uppercase tracking-[0.18em] text-[#F7D117] drop-shadow-[0_0_5px_rgba(247,209,23,0.42)]">
                  <span className="mx-4 text-[#F7D117]">{label}</span>
                  <span className="text-[#F7D117]/95">{teams.join("  •  ")}</span>
                  <span className="mx-5 text-[#F7D117]/75">///</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrothersTopBarTitle() {
  return (
    <img
      src={ASSETS.branding?.myMundialLogo || ASSETS.myMundialLogo}
      alt="Brothers!"
      className="mx-auto h-[31px] w-auto max-w-[175px] object-contain drop-shadow-[0_3px_7px_rgba(0,0,0,0.20)]"
      draggable={false}
    />
  );
}

function StaticHomeTopBar() {
  return (
    <section className="relative z-[1000] flex shrink-0 items-center justify-center overflow-visible bg-[#063B25] px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]" style={{ height: MATCH_TOP_BAR_HEIGHT_PX }}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 z-[1] h-10 w-10 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
      <div className="relative z-[1] flex h-full items-center justify-center"><BrothersTopBarTitle /></div>
      <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="absolute right-3 top-1/2 z-[1] h-10 w-10 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
    </section>
  );
}

function HomeMenuBar({ menuProps = {}, staticRightLogo = false }) {
  return (
    <ScreenTopBar {...menuProps} style={{ height: MATCH_TOP_BAR_HEIGHT_PX }}>
      <BrothersTopBarTitle />
    </ScreenTopBar>
  );
}

function ScoreboardPlaceholder({ allTeamsUnlocked = false, menuProps = {}, staticRightLogo = false }) {
  const scoreboardHeight = `calc((100dvh - ${MATCH_TOP_BAR_HEIGHT_PX}px) * ${MATCH_SCOREBOARD_RATIO})`;
  const flashTickerHeight = `calc(${scoreboardHeight} * ${MC_SELECTION_LAYOUT.tickerRatio})`;
  const scoreboardMainHeight = `calc(${scoreboardHeight} - ${flashTickerHeight})`;
  return (
    <div className="relative z-[1] shrink-0 overflow-hidden bg-transparent" style={{ height: `calc(${MATCH_TOP_BAR_HEIGHT_PX}px + ${scoreboardHeight})` }} >
      <HomeMenuBar menuProps={menuProps} staticRightLogo={staticRightLogo} />
      <div className="relative mt-0 overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[inset_0_1px_0_rgba(245,241,232,0.16)]" style={{ height: scoreboardMainHeight }}>
        <div
          className="pointer-events-none absolute left-[2px] right-[2px] top-[2px] bottom-[2px] opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(247,209,23,0.24) 0.72px, transparent 1.44px)",
            backgroundSize: "6px calc(100% / 12)",
            backgroundPosition: "center top",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
        <div className="relative z-[1] flex h-full items-center justify-center">
          <div className="flex h-[86%] w-full items-center justify-center px-[3.5%] py-0">
            <div className="grid h-full w-full grid-cols-1 grid-rows-[25%_50%_25%] items-center">
              <div className="row-start-1 flex h-full items-center justify-center py-0">
                <div className="led-text-glow font-led inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(12px,3.2vw,22px)] py-0 text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] text-[#F7D117] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
                  <span className="flex min-h-[clamp(13px,1.8vh,18px)] items-center justify-center leading-none">WELCOME TO</span>
                </div>
              </div>
              <div className="row-start-2 flex h-full min-w-0 items-center justify-center px-[2%] py-0">
                <div className="led-text-glow font-led flex h-full w-full items-center justify-center whitespace-nowrap text-center text-[clamp(17px,3.1vh,34px)] font-black leading-none tracking-tight text-[#F7D117]">MONDAY CUP</div>
              </div>
              <div className="row-start-3 flex h-full items-center justify-center py-0">
                <div className="led-text-glow font-led inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(14px,3.8vw,26px)] py-0 text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] text-[#F7D117] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
                  <span className="flex min-h-[clamp(13px,1.8vh,18px)] items-center justify-center leading-none">INTERNATIONAL SOCCER SHOOTOUT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HomeFlashTeamTicker scoreboardHeight={scoreboardHeight} tickerHeight={flashTickerHeight} />
    </div>
  );
}

function HomeLayout({ children, allTeamsUnlocked = false, menuProps = {}, staticRightLogo = false }) {
  return (
    <Shell>
      <div className="home-main-font relative flex h-[100dvh] flex-col overflow-hidden bg-[#0d6c3d] text-[#072D1D]">
        <ScoreboardPlaceholder allTeamsUnlocked={allTeamsUnlocked} menuProps={menuProps} staticRightLogo={staticRightLogo} />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <HomePitchBackdrop />
          <FloatingHomeLogo />
          <HomeConfirmSlotBrothersLogo />
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col px-5 pb-0" style={{ top: HOME_MENU_TOP_OFFSET }}>
            <div className="min-h-0 flex-1 overflow-y-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-h-full flex-col justify-start">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}

function ActionButton({ children, eyebrow, onClick, variant = "light", disabled = false, type = "button", size = "normal", className = "" }) {
  const styles = variant === "yellow"
    ? "border-[#F7D117]/75 bg-[#F7D117] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)]"
    : variant === "green"
      ? "border-[#F5F0E6]/20 bg-[#072D1D] text-[#F5F0E6]"
      : variant === "account"
        ? "border-[#F5F0E6]/18 bg-[#F5F0E6]/18 text-[#F5F0E6]"
        : "border-[#D4AF37]/50 bg-[#F5F0E6] text-[#0B5F35]";

  const heightClass = size === "hero" ? "min-h-[62px] py-3" : size === "journey" ? "h-[50px]" : "h-[44px]";
  const textClass = size === "hero" ? "text-[clamp(20px,5.4vw,30px)] tracking-[0.075em]" : size === "journey" ? "text-[clamp(13px,3.6vw,18px)] tracking-[0.07em]" : "text-[clamp(12px,3.45vw,20px)] tracking-[0.055em]";

  return <button type={type} onClick={onClick} disabled={disabled} className={`flex ${heightClass} w-full items-center justify-center rounded-[1rem] border px-4 text-center transition ${styles} ${disabled ? "opacity-70" : "active:scale-[0.99]"} ${className}`}>
    {eyebrow && <span className="sr-only">{eyebrow}</span>}
    <div className={`home-copy-bold w-full truncate whitespace-nowrap ${textClass} uppercase leading-none`}>{children}</div>
  </button>;
}

function SavedCampaignCard({ summary, onContinue }) {
  if (!summary) return null;
  return <button onClick={onContinue} className="w-full rounded-[1.35rem] border border-[#F7D117]/42 bg-[#052D1D]/68 p-4 text-left text-[#F5F1E8] shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
    <div className="text-[8px] font-black uppercase tracking-[0.24em] text-[#F7D117]/82">CONTINUE CAMPAIGN</div>
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[21px] font-black uppercase leading-none tracking-[-0.02em] text-[#F5F1E8]">{summary.team}</div>
        <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#F5F1E8]/58">{summary.matchStage} · v {summary.opponent}</div>
      </div>
      <div className="shrink-0 rounded-full bg-[#F7D117] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#072D1D]">PLAY</div>
    </div>
  </button>;
}

function HomeMenuShell({ children, className = "", onBack }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.65rem] text-[#F5F1E8] ${className}`}
      style={mcSoftPanelStyle}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 top-2 z-20 flex h-[34px] w-[34px] items-center justify-center text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)] active:scale-[0.96]"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5L8 12L15 19" /></svg>
        </button>
      )}
      <div className="px-4 py-2 shadow-none">
        {children}
      </div>
    </div>
  );
}

function FloatingHomeLogo() {
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[20] flex justify-center" style={{ top: HOME_LOGO_CENTER_Y, transform: "translateY(-50%)" }} aria-hidden="true">
      <div className="relative flex w-[99.825%] max-w-[92vw] items-start justify-center" style={{ height: HOME_LOGO_HEIGHT }}>
        <div className="absolute inset-x-10 bottom-2 h-[42%] rounded-full bg-[#F7D117]/28 blur-3xl" />
        <div className="absolute inset-x-14 bottom-3 h-[36%] rounded-full bg-[#F5F1E8]/24 blur-2xl" />
        <img src={FLOATING_HOME_LOGO_SRC} alt="Monday Cup" className="relative z-10 h-full w-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.44)]" draggable={false} />
      </div>
    </div>
  );
}

function HomeConfirmSlotBrothersLogo() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[21] flex justify-center"
      style={{ bottom: MC_SELECTION_LAYOUT.bottomBrandBottom }}
      aria-hidden="true"
    >
      <img
        src={ASSETS.branding?.myMundialLogo || ASSETS.myMundialLogo}
        alt="Brothers!"
        className="h-[31px] w-auto max-w-[175px] object-contain opacity-95 drop-shadow-[0_3px_7px_rgba(0,0,0,0.20)]"
        draggable={false}
      />
    </div>
  );
}

function AuthInput({ icon, type = "text", placeholder, value, onChange, autoComplete, maxLength, rightAction, inputMode }) {
  return (
    <AuthTextInput
      icon={icon}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      maxLength={maxLength}
      rightAction={rightAction}
      inputMode={inputMode}
    />
  );
}

function authErrorMessage(error) {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use") return "That email is already registered";
  if (code === "auth/invalid-email") return "Please enter a valid email address";
  if (code === "auth/missing-password") return "Please enter a password";
  if (code === "auth/weak-password") return "Password should be at least 6 characters";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") return "Email or password not recognised";
  return error?.message || "Something went wrong please try again";
}

function AuthPanel({ mode, setMode, onBack, onAuthComplete, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [verifyUser, setVerifyUser] = useState(null);
  const [verifyProfile, setVerifyProfile] = useState(null);
  const [verifyButtonText, setVerifyButtonText] = useState("VERIFY YOUR EMAIL ADDRESS");
  const [verificationComplete, setVerificationComplete] = useState(false);
  const isRegister = mode === "register" || mode === "signup";

  const resetMessages = () => {
    setAuthError("");
    setAuthSuccess("");
  };

  const authActionSettings = () => {
    if (typeof window === "undefined") return undefined;
    return {
      url: window.location.origin,
      handleCodeInApp: false,
    };
  };

  const switchMode = (nextMode) => {
    resetMessages();
    setMode(nextMode);
  };

  const completeVerifiedAuth = async (user = verifyUser, profile = verifyProfile) => {
    if (!user || verificationComplete) return;
    setVerificationComplete(true);
    await ensureUserDocument(user, profile?.username || user.displayName || "Player", {
      ...(profile || {}),
      accountStatus: { emailVerified: true, verificationRequired: false },
    });
    await onAuthComplete?.(user, {
      navigate: false,
      source: profile?.username ? "home-signup" : "home-signin",
      isSignup: Boolean(profile?.username),
      emailVerified: true,
    });
    onSignedIn?.(user, { isSignup: Boolean(profile?.username) });
    setVerifyButtonText("EMAIL VERIFIED");
  };

  const checkEmailVerification = async () => {
    const user = verifyUser || auth.currentUser;
    if (!user) return false;
    await user.reload();
    const freshUser = auth.currentUser || user;
    if (freshUser.emailVerified) {
      await completeVerifiedAuth(freshUser);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!verifyUser || verificationComplete) return undefined;
    const handleFocus = () => { checkEmailVerification().catch(() => {}); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleFocus();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(handleFocus, 5000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, [verifyUser, verificationComplete]);

  const handleSendVerification = async (event) => {
    event?.preventDefault?.();
    resetMessages();
    const user = verifyUser || auth.currentUser;
    if (!user) {
      setAuthError("Please sign in again");
      return;
    }
    try {
      setAuthLoading(true);
      const alreadyVerified = await checkEmailVerification();
      if (alreadyVerified) return;
      await sendEmailVerification(user);
      setVerifyButtonText("RESEND VERIFICATION EMAIL");
      setAuthSuccess("Verification email sent please check your inbox");
    } catch (error) {
      const code = String(error?.code || "");
      if (code.includes("too-many-requests")) setAuthError("Please wait before sending another email");
      else setAuthError(error?.message || "Could not send verification email");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      setAuthError("Please enter a username");
      return;
    }

    try {
      setAuthLoading(true);
      resetMessages();

      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      await updateProfile(credential.user, { displayName: trimmedUsername });

      const profile = {
        username: trimmedUsername,
        emailOptIn,
        accountStatus: { emailVerified: false, verificationRequired: true },
      };
      setVerifyProfile(profile);
      setVerifyUser(credential.user);

      try {
        await sendEmailVerification(credential.user);
        setVerifyButtonText("RESEND VERIFICATION EMAIL");
        setAuthSuccess("Verification email sent please check your inbox");
      } catch (verificationError) {
        const code = String(verificationError?.code || "");
        setVerifyButtonText("SEND VERIFICATION EMAIL");
        if (code.includes("too-many-requests")) {
          setAuthError("Verification email not sent please wait before trying again");
        } else {
          setAuthError("Account created but verification email did not send please tap the button below");
        }
      }
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      resetMessages();
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await credential.user.reload();
      const freshUser = auth.currentUser || credential.user;
      if (!freshUser.emailVerified) {
        setVerifyProfile({ accountStatus: { emailVerified: false, verificationRequired: true } });
        setVerifyUser(freshUser);
        setVerifyButtonText("VERIFY YOUR EMAIL ADDRESS");
        setAuthSuccess("Please verify your email to unlock Monday Club");
        return;
      }
      await onAuthComplete?.(freshUser, { navigate: false, source: "home-signin", emailVerified: true });
      onSignedIn?.(freshUser, { isSignup: false });
      setAuthSuccess("Signed in welcome back");
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (authLoading) return;
    if (isRegister) await handleRegister();
    else await handleSignIn();
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase().replace(",", ".");

    if (!trimmedEmail) {
      setAuthError("Please enter your email address first");
      setAuthSuccess("");
      return;
    }

    try {
      setAuthLoading(true);
      resetMessages();
      await sendPasswordResetEmail(auth, trimmedEmail, authActionSettings());
      setAuthSuccess("If that email is registered, a password reset link has been sent");
    } catch (error) {
      const code = String(error?.code || "");
      if (code.includes("invalid-email")) setAuthError("Please enter a valid email address");
      else if (code.includes("too-many-requests")) setAuthError("Please wait before requesting another reset link");
      else setAuthError("Could not send reset link please try again");
    } finally {
      setAuthLoading(false);
    }
  };

  if (verifyUser) {
    return <div className="space-y-3">
      <HomeMenuShell onBack={onBack}>
        <div className="flex min-h-[30px] items-center justify-center text-center">
          <div className={MENU_TITLE_CLASS}>VERIFY EMAIL</div>
        </div>
        <div className="mt-3 space-y-2 text-center">
          <p className="home-copy-regular mx-auto max-w-[280px] text-[10px] uppercase leading-snug tracking-[0.07em] text-[#F5F1E8]/78">
            Check the inbox for {verifyUser.email}. Return here after verifying.
          </p>
          {authError && <div className="home-copy-regular rounded-[0.8rem] bg-red-500/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-red-100">{authError}</div>}
          {authSuccess && <div className="home-copy-regular rounded-[0.8rem] bg-[#B7FF3C]/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-[#B7FF3C]">{authSuccess}</div>}
          <AuthPrimaryButton type="button" loading={authLoading} disabled={verificationComplete} onClick={handleSendVerification}>
            {authLoading ? "SENDING..." : verifyButtonText}
          </AuthPrimaryButton>
        </div>
      </HomeMenuShell>
    </div>;
  }

  if (forgotPassword) {
    return <div className="space-y-3">
      <HomeMenuShell onBack={() => { resetMessages(); setForgotPassword(false); }}>
        <div className="flex min-h-[30px] items-center justify-center text-center">
          <div className={MENU_TITLE_CLASS}>RESET PASSWORD</div>
        </div>
        <form className="mt-3 space-y-2" onSubmit={handleForgotPassword}>
          <AuthInput icon={<AtIcon className="h-5 w-5" />} placeholder="Confirm email address" type="text" inputMode="email" value={email} onChange={(event) => { resetMessages(); setEmail(event.target.value); }} />
          {authError && <div className="home-copy-regular rounded-[0.8rem] bg-red-500/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-red-100">{authError}</div>}
          {authSuccess && <div className="home-copy-regular rounded-[0.8rem] bg-[#B7FF3C]/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-[#B7FF3C]">{authSuccess}</div>}
          <AuthPrimaryButton type="submit" loading={authLoading}>{authLoading ? "SENDING..." : "SEND RESET LINK"}</AuthPrimaryButton>
        </form>
      </HomeMenuShell>
    </div>;
  }

  return <div className="space-y-3">
    <HomeMenuShell onBack={onBack}>
      <div className={`mb-3 flex min-h-[34px] items-center justify-center text-center ${MENU_TITLE_CLASS}`}>MONDAY CLUB</div>
<AuthTabs mode={mode} onChange={switchMode} />
      <form className="mt-2 space-y-1.5" onSubmit={handleSubmit}>
        {isRegister && <AuthInput icon={<StarIcon className="h-5 w-5" />} placeholder="Username" value={username} onChange={(event) => { resetMessages(); setUsername(event.target.value); }} />}
        <AuthInput icon={<AtIcon className="h-5 w-5" />} placeholder="Email address" type="text" inputMode="email" value={email} onChange={(event) => { resetMessages(); setEmail(event.target.value); }} />
        <AuthTextInput icon={<PadlockIcon className="h-5 w-5" />} placeholder="Password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => { resetMessages(); setPassword(event.target.value); }} rightAction={<PasswordVisibilityButton visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />} />
        <AuthPrimaryButton type="submit" loading={authLoading}>{authError || authSuccess || (authLoading ? "LOADING..." : isRegister ? "REGISTER" : "SIGN IN")}</AuthPrimaryButton>
        {isRegister && (
          <AuthEmailCommsCheckbox checked={emailOptIn} onChange={setEmailOptIn} />
        )}
        {!isRegister && (
<AuthForgotPasswordButton onClick={() => { resetMessages(); setForgotPassword(true); }}>
  FORGOT PASSWORD?
</AuthForgotPasswordButton>
        )}
      </form>
    </HomeMenuShell>
  </div>;
}

function WelcomeBackPanel({ onResume, onNewCampaign, hasResumeCampaign = false, onMondayClub }) {
  return <div className="space-y-3">
    <HomeMenuShell>
      <div className={`mb-3 flex min-h-[34px] items-center justify-center text-center ${MENU_TITLE_CLASS}`}>WELCOME BACK</div>
      <div className="flex flex-col gap-3">
        <ActionButton onClick={onNewCampaign} variant="yellow" size="journey">NEW CAMPAIGN</ActionButton>
        {hasResumeCampaign && <ActionButton onClick={onResume} variant="yellow" size="journey">RESUME GAME</ActionButton>}
        <ActionButton onClick={onMondayClub} variant="yellow" size="journey">MONDAY CLUB</ActionButton>
      </div>
    </HomeMenuShell>
  </div>;
}

function LandingPanel({ onPlayGuest, currentUser, onOpenClubhouse, onOpenAuthPanel, onAuthComplete, onResumeCampaign, hasResumeCampaign = false }) {
  const [authMode, setAuthMode] = useState(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  if (showWelcomeBack) {
    return <WelcomeBackPanel onResume={onResumeCampaign} onNewCampaign={onPlayGuest} hasResumeCampaign={hasResumeCampaign} onMondayClub={() => { if (currentUser?.uid) onOpenClubhouse?.(); else if (typeof onOpenAuthPanel === "function") onOpenAuthPanel("signin", { showLogoBack: true }); else setAuthMode("signin"); }} />;
  }
  if (authMode) return <AuthPanel mode={authMode} setMode={setAuthMode} onBack={() => setAuthMode(null)} onAuthComplete={onAuthComplete} onSignedIn={(user, meta) => { setAuthMode(null); if (meta?.isSignup) onPlayGuest?.(); else onOpenClubhouse?.(); }} />;

  const handleMondayClub = () => {
    if (currentUser?.uid) onOpenClubhouse?.();
    else if (typeof onOpenAuthPanel === "function") onOpenAuthPanel("signin", { showLogoBack: true });
    else setAuthMode("signin");
  };

  return <div className="space-y-3">
    <HomeMenuShell>
      <div className={`mb-3 flex min-h-[34px] items-center justify-center text-center ${MENU_TITLE_CLASS}`}>START YOUR JOURNEY</div>
      <div className="flex flex-col gap-3">
        <ActionButton onClick={onPlayGuest} variant="yellow" size="journey">NEW CAMPAIGN</ActionButton>
        {hasResumeCampaign && <ActionButton onClick={onResumeCampaign} variant="yellow" size="journey">RESUME GAME</ActionButton>}
        <ActionButton onClick={handleMondayClub} variant="yellow" size="journey">MONDAY CLUB</ActionButton>
      </div>
    </HomeMenuShell>
  </div>;
}

function getTeamGroup(teamName) {
  return GROUP_LETTERS.find((letter) => GROUPS[letter].includes(teamName)) || "A";
}

function HostPanel({ onSelectGroup, onSelectTeam, onBack, currentUser = null, onAuthComplete, allTeamsUnlocked = false, onUnlockAllTeams }) {
  const hostLabels = { Canada: "CAN", Mexico: "MEX", "United States": "USA" };
  const [authMode, setAuthMode] = useState(null);

  if (authMode) {
    return (
      <AuthPanel
        mode={authMode}
        setMode={setAuthMode}
        onBack={() => setAuthMode(null)}
        onAuthComplete={onAuthComplete}
        onSignedIn={() => setAuthMode(null)}
      />
    );
  }

  return <HomeMenuShell onBack={onBack}>
    <div className={`mb-3 flex min-h-[34px] items-center justify-center text-center ${MENU_TITLE_CLASS}`}>CHOOSE YOUR TEAM</div>
    <div className="grid grid-cols-3 gap-2">
      {HOST_TEAMS.map((host) => {
        const theme = getTeamTheme(host.name);
        const label = hostLabels[host.name] || host.name.slice(0, 3).toUpperCase();
        return (
          <button
            key={host.name}
            onClick={() => onSelectTeam(host.name, host.group)}
            className="relative flex h-[50px] items-center justify-center overflow-hidden rounded-[1rem] border border-[#F5F1E8]/22 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.99]"
            style={{ backgroundColor: theme.bg, color: theme.text }}
          >
            <span className="home-copy-bold absolute left-[13%] top-1/2 min-w-[2.4em] -translate-y-1/2 text-left text-[clamp(12px,3vw,15px)] uppercase leading-none tracking-[0.07em]">{label}</span>
            <span className="absolute left-1/2 top-1/2 flex h-[18px] w-[25px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[0.2rem] border border-[#F5F1E8]/82 bg-[#F5F1E8] shadow-[0_2px_5px_rgba(0,0,0,0.16)]">
              <Flag team={host.name} className="h-full w-full object-contain" />
            </span>
            <span className="home-copy-bold absolute right-[11%] top-1/2 -translate-y-1/2 text-right text-[clamp(12px,3vw,15px)] uppercase leading-none tracking-[0.06em] opacity-78 tabular-nums">#{TEAM_RANK[host.name]}</span>
          </button>
        );
      })}
    </div>
    <button onClick={() => { if (allTeamsUnlocked) onSelectGroup("A"); else if (typeof onUnlockAllTeams === "function") onUnlockAllTeams(); else setAuthMode(currentUser?.uid ? "signin" : "signup"); }} className="relative mt-3 flex h-[50px] w-full items-center justify-center rounded-[1rem] border-2 border-[#F7D117]/85 bg-[#F7D117] px-5 text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.08)] active:scale-[0.99]">
      {allTeamsUnlocked ? <OpenPadlockIcon className="absolute left-5 h-7 w-7" /> : <PadlockIcon className="absolute left-5 h-7 w-7" />}
      <div className="home-copy-bold min-w-0 truncate text-center text-[clamp(13px,3.5vw,17px)] uppercase leading-none tracking-[0.075em]">ALL TEAMS</div>
      <div className="absolute right-5 text-right">
        {allTeamsUnlocked ? <span className="inline-flex min-h-[19px] items-center justify-center rounded-full bg-[#052D1D]/88 px-2.5 home-copy-bold text-[8.5px] uppercase leading-none tracking-[0.08em] text-[#F7D117]">ACTIVE</span> : <span className="home-copy-bold text-[19px] uppercase tracking-[0.06em]">£1.99</span>}
      </div>
    </button>
  </HomeMenuShell>;
}

function ArrowButton({ direction, onClick }) {
  return <button onClick={onClick} className="flex h-8 w-8 items-center justify-center text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]"><svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{direction === "left" ? <path d="M15 5L8 12L15 19" /> : <path d="M9 5L16 12L9 19" />}</svg></button>;
}

function TeamPanel({ group, onSelectGroup, onSelectTeam, onBack }) {
  const currentIndex = GROUP_LETTERS.indexOf(group);
  const previousGroup = () => onSelectGroup(GROUP_LETTERS[(currentIndex - 1 + GROUP_LETTERS.length) % GROUP_LETTERS.length]);
  const nextGroup = () => onSelectGroup(GROUP_LETTERS[(currentIndex + 1) % GROUP_LETTERS.length]);
  return <HomeMenuShell onBack={onBack}>
    <div className="mb-3 flex min-h-[34px] items-center justify-center gap-4">
      <ArrowButton direction="left" onClick={previousGroup} />
      <div className={MENU_TITLE_CLASS}>GROUP {group}</div>
      <ArrowButton direction="right" onClick={nextGroup} />
    </div>
    <div className="grid gap-2">
      {GROUPS[group].map((name) => {
        const theme = getTeamTheme(name);
        return <button key={name} onClick={() => onSelectTeam(name)} className="grid h-[42px] grid-cols-[40px_minmax(0,1fr)_32px] items-center gap-2 rounded-[1.15rem] border border-[#F5F1E8]/18 px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.99]" style={{ backgroundColor: theme.bg, color: theme.text }}><span className="flex h-6 w-8 items-center justify-center overflow-hidden rounded-[0.25rem] border border-[#F5F1E8]/24 bg-[#F5F1E8]/90 shadow-[0_2px_5px_rgba(0,0,0,0.18)]"><Flag team={name} className="h-full w-full object-contain" /></span><span className="home-copy-bold truncate text-center text-[19px] uppercase tracking-[0.06em]">{name}</span><span className="home-copy-bold text-right text-[12px] tabular-nums tracking-[0.08em] opacity-65">#{TEAM_RANK[name]}</span></button>;
      })}
    </div>
  </HomeMenuShell>;
}

export function HomeScreen({ onSelectGroup, onSelectTeam, onUnlockAllTeams, allTeamsUnlocked = false, currentUser = null, onOpenClubhouse, onOpenAuthPanel, onAuthComplete, onResumeCampaign, hasResumeCampaign = false, menuProps = {} }) {
  const [homeMode, setHomeMode] = useState("landing");
  if (homeMode === "hosts") return <HomeLayout allTeamsUnlocked={allTeamsUnlocked} menuProps={menuProps}><HostPanel onBack={() => setHomeMode("landing")} onSelectGroup={onSelectGroup} onSelectTeam={onSelectTeam} currentUser={currentUser} onAuthComplete={onAuthComplete} allTeamsUnlocked={allTeamsUnlocked} onUnlockAllTeams={onUnlockAllTeams} /></HomeLayout>;
  return <HomeLayout allTeamsUnlocked={allTeamsUnlocked} menuProps={menuProps} staticRightLogo><LandingPanel currentUser={currentUser} onOpenClubhouse={onOpenClubhouse} onOpenAuthPanel={onOpenAuthPanel} onAuthComplete={onAuthComplete} onResumeCampaign={onResumeCampaign} hasResumeCampaign={hasResumeCampaign} onPlayGuest={() => setHomeMode("hosts")} /></HomeLayout>;
}
export function HostSelectScreen(props) { return <HomeLayout allTeamsUnlocked={props.allTeamsUnlocked} menuProps={props.menuProps || {}}><HostPanel {...props} /></HomeLayout>; }
export function TeamSelectScreen({ selectedGroup, onSelectGroup, onSelectTeam, onBack, allTeamsUnlocked = false, menuProps = {} }) { return <HomeLayout allTeamsUnlocked={allTeamsUnlocked} menuProps={menuProps}><TeamPanel group={selectedGroup} onBack={onBack} onSelectGroup={onSelectGroup} onSelectTeam={onSelectTeam} /></HomeLayout>; }
