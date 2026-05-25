import { useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { HOST_TEAMS, GROUPS, GROUP_LETTERS, TEAM_RANK, getTeamTheme } from "../../data/teams.js";
import { ASSETS } from "../../data/assets.js";
import { Flag } from "../shared.jsx";
import { GreenCard, SelectionLayout, Shell } from "../layout/Layout.jsx";

const GAME = {
  goal: { left: 10, top: 8, width: 80, height: 30 },
  spot: { x: 50, y: 54.5 },
};


const TROPHY_PIXEL_SRC = "/trophy_pixel.png";
const MONDAY_CUP_AD_SRC = "/monday-cup-ad.png";
const TROPHY_AD_SRC = "/trophy-ad.png";
const SCOREBOARD_STAGE_TEXT = "font-led text-[clamp(9px,1.35vh,16px)] font-black uppercase leading-none tracking-[0.14em] text-[#F7D117]";
const SCOREBOARD_MAIN_TEXT = "font-led text-[clamp(17px,3.05vh,34px)] font-black uppercase leading-none tracking-normal text-[#F7D117]";
const SCOREBOARD_MARKER_TEXT = "font-led text-[clamp(6px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.12em] text-[#F7D117]";
const MENU_TITLE_CLASS = "home-copy-bold text-[28px] uppercase leading-none tracking-[0.07em] text-[#F5F1E8]";
const HOME_MAIN_HEIGHT = "calc(100dvh - (54px + ((100dvh - 54px) * 0.165)))";
const HOME_LOGO_TOP_RATIO = 0;
const HOME_LOGO_TOP_PADDING = "0px";
const HOME_LOGO_HEIGHT = `calc(${HOME_MAIN_HEIGHT} * 0.30)`;
const HOME_LOGO_GAP = "clamp(12px,1.8vh,22px)";
const HOME_MENU_TOP_OFFSET = `calc(${HOME_LOGO_TOP_PADDING} + (${HOME_MAIN_HEIGHT} * ${HOME_LOGO_TOP_RATIO}) + ${HOME_LOGO_HEIGHT} + ${HOME_LOGO_GAP})`;

function AtIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M16.1 8.1v5.2c0 1.2.7 2 1.8 2 1.5 0 2.6-1.6 2.6-3.6 0-4.7-3.4-8.2-8.2-8.2-5.2 0-8.8 3.8-8.8 8.8 0 5.1 3.8 8.2 8.9 8.2 1.7 0 3.2-.3 4.6-.9" />
    </svg>
  );
}

function PadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4s3.6 1.4 3.6 3.6V10" />
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

function ScoreboardTrophy({ side }) {
  return (
    <img
      src={TROPHY_PIXEL_SRC}
      alt=""
      className={`h-[clamp(28px,4.55vh,48px)] w-auto object-contain opacity-95 drop-shadow-[0_0_7px_rgba(247,209,23,0.38)] ${side === "left" ? "scale-x-[-1]" : ""}`}
      draggable={false}
      aria-hidden="true"
    />
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
  const boardHeight = 8;
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
  const shirts = [
    "#2DA94F", "#F7D117", "#FF1E3C", "#E1251B", "#2F3ED6", "#8A1538", "#FF8A00", "#1E7FF0",
    "#157A52", "#93BFEA", "#FFFFFF", "#2437C6", "#F20D1B", "#00A86B", "#7CB5E8", "#F7C600",
    "#E10600", "#1A22C9", "#9B003F", "#D50000", "#FF3B30", "#3131E8"
  ];
  const skins = ["#c98f65", "#8f5f3f", "#e0b184", "#6f4632"];
  const makeRow = ({ count, step, y, scale, opacity, stagger = 0, wave = 0, shirtOffset = 0, skinOffset = 0 }) => {
    const centredStartX = 50 - (((count - 1) * step) + stagger) / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: centredStartX + i * step + (i % 2 ? stagger : 0),
      y: y + (i % 3) * wave,
      scale,
      shirt: shirts[((i * 7) + shirtOffset) % shirts.length],
      skin: skins[(i + skinOffset) % skins.length],
      pose: i % 4 === 0 || i % 7 === 0 ? "up" : "down",
      opacity,
    }));
  };

  // Match crowd uses 9 rows across 30% of the match pitch area.
  // Home crowd runs from below the top LED to the behind-goal LED board, which is about 1.7x taller
  // on the target mobile viewport, so 16 rows keeps the visual row density consistent.
  const rowConfigs = Array.from({ length: 16 }, (_, index) => {
    const t = index / 15;
    const y = 2.5 + 94 * Math.pow(t, 1.24);
    return {
      count: Math.round(62 - t * 34),
      step: 1.68 + t * 2.45,
      y,
      scale: 0.26 + t * 0.78,
      opacity: 0.16 + t * 0.84,
      stagger: 0.18 + t * 1.04,
      wave: 0.12 + t * 0.80,
      shirtOffset: index,
      skinOffset: index % skins.length,
    };
  });

  const crowdRows = rowConfigs.flatMap((config) => makeRow(config));

  const boardTop = GAME.goal.top + GAME.goal.height - 8;
  const headerHeight = "calc(54px + ((100dvh - 54px) * 0.165))";
  const mainHeight = "calc(100dvh - (54px + ((100dvh - 54px) * 0.165)))";
  const topLedHeight = `calc(${mainHeight} * 0.08)`;
  const crowdHeight = `calc(${headerHeight} + (${mainHeight} * ${boardTop / 100}) - ${topLedHeight})`;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-0 overflow-hidden" style={{ top: topLedHeight, height: crowdHeight }} aria-hidden="true">
      <div className="absolute inset-0 bg-[#123822]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(180deg, rgba(5,26,17,0.52), rgba(5,26,17,0.28) 30%, rgba(5,26,17,0.18) 58%, rgba(5,26,17,0.10) 100%), radial-gradient(circle at 18% 10%, rgba(245,241,232,0.05), transparent 18%), radial-gradient(circle at 82% 14%, rgba(255,214,0,0.04), transparent 16%)",
        }}
      />
      <div className="absolute inset-x-0 top-[6%] h-[6%]" style={{ backgroundColor: "rgba(11,45,29,0.10)" }} />
      <div className="absolute inset-x-0 top-[16%] h-[7%]" style={{ backgroundColor: "rgba(11,45,29,0.08)" }} />
      <div className="absolute inset-x-0 top-[28%] h-[8%]" style={{ backgroundColor: "rgba(11,45,29,0.10)" }} />
      <div className="absolute inset-x-0 top-[41%] h-[9%]" style={{ backgroundColor: "rgba(11,45,29,0.08)" }} />
      <div className="absolute inset-x-0 top-[55%] h-[10%]" style={{ backgroundColor: "rgba(11,45,29,0.10)" }} />
      <div className="absolute inset-x-0 top-[70%] h-[11%]" style={{ backgroundColor: "rgba(11,45,29,0.08)" }} />
      <div className="absolute inset-x-0 top-[85%] h-[10%]" style={{ backgroundColor: "rgba(11,45,29,0.10)" }} />
      {crowdRows.map((person, index) => <HomeCrowdPerson key={index} {...person} />)}
    </div>
  );
}


function HomeLedAdvertisingHoard() {
  const goalLine = GAME.goal.top + GAME.goal.height;
  const boardHeight = 8;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] overflow-hidden border-t border-[#05150E] bg-[#072D1D] shadow-[0_-8px_24px_rgba(0,0,0,0.42)]" style={{ top: `${goalLine - boardHeight}%`, height: `${boardHeight}%` }}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
      <div className="relative mx-auto flex h-full max-w-[76%] items-center justify-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5F1E8]/16 blur-xl" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[48%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F7D117]/12 blur-lg" aria-hidden="true" />
        <img src={MONDAY_CUP_AD_SRC} alt="Monday Cup" className="relative z-[1] h-[82%] w-full object-contain drop-shadow-[0_0_11px_rgba(245,241,232,0.34)]" draggable={false} />
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
      <HomeCrowdBackdrop />
      <HomeLedAdvertisingHoard />
      <div className="absolute bottom-0 left-0 right-0" style={{ top: `${goalLine}%`, backgroundImage: "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))" }} />
      <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${goalLine}%` }} />
      <div className="pointer-events-none absolute z-[3] rounded-b-[999px] border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]" style={{ left: "5%", top: `${goalLine}%`, width: "90%", height: "24.2%" }} />
      <HomeGoalFrame />
      <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${GAME.spot.x}%`, top: `${GAME.spot.y}%` }} />
    </div>
  );
}


function HomeFlashCommentaryBar() {
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
      className="absolute inset-x-0 bottom-0 z-[0] h-[26%] w-full overflow-hidden border-y border-[#F5F1E8]/24 px-[12%] shadow-[0_0_8px_rgba(245,241,232,0.05),inset_0_2px_8px_rgba(255,255,255,0.08)] transition-colors duration-150"
      style={{ background: theme.bg, color: theme.text }}
      aria-live="off"
    >
      <div className="grid h-full grid-cols-[34px_minmax(0,1fr)_34px] items-center gap-[3%]">
        <span className="flex h-[clamp(12px,2.05vh,21px)] w-[clamp(18px,3.2vh,32px)] items-center justify-center self-center overflow-hidden rounded-[0.2rem] border border-[#F5F1E8]/78 bg-[#F5F1E8]/94 shadow-[0_2px_5px_rgba(0,0,0,0.24)]">
          <Flag team={activeTeam} className="h-full w-full object-cover" />
        </span>
        <span className="home-copy-bold flex min-w-0 items-center justify-center truncate text-center text-[clamp(13px,2.3vh,28px)] uppercase leading-none tracking-[0.085em]">
          {activeTeam}
        </span>
        <span className="home-copy-bold flex items-center justify-end text-right text-[clamp(9px,1.55vh,16px)] uppercase leading-none tracking-[0.09em] opacity-[0.72] tabular-nums">
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

function HomeMenuBar() {
  return (
    <div className="relative z-[3] flex h-[54px] shrink-0 items-center justify-center overflow-hidden bg-[#072D1D] px-6 text-[#F5F1E8]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
      <img src={MONDAY_CUP_AD_SRC} alt="Monday Cup" className="relative z-[1] h-[30px] w-auto object-contain" draggable={false} />
      <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
    </div>
  );
}

function ScoreboardPlaceholder({ allTeamsUnlocked = false }) {
  const scoreboardHeight = "calc((100dvh - 54px) * 0.165)";
  return (
    <div className="relative z-[1] shrink-0 overflow-hidden bg-[#050505]" style={{ height: `calc(54px + ${scoreboardHeight})` }} aria-hidden="true">
      <HomeMenuBar />
      <div className="relative overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[inset_0_1px_0_rgba(245,241,232,0.16),inset_0_-1px_0_rgba(245,241,232,0.18),0_2px_8px_rgba(0,0,0,0.22)]" style={{ height: scoreboardHeight }}>
        <div
          className="absolute inset-x-0 top-[4px] bottom-[4px] opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(247,209,23,0.24) 0.78px, transparent 1.55px)",
            backgroundSize: "7px 7px",
            backgroundPosition: "3.5px 3.5px",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
        <div className="absolute inset-x-0 bottom-[26%] z-[2] h-px bg-[#F5F1E8]/20 shadow-[0_0_6px_rgba(245,241,232,0.10)]" />
        <HomeFlashCommentaryBar allTeamsUnlocked={allTeamsUnlocked} />
        <div className="relative z-[1] h-full">
          <div className="led-text-glow font-led grid h-[22%] place-items-center py-[2%] text-center text-[clamp(9px,1.35vh,16px)] font-black uppercase tracking-[0.14em] text-[#F7D117]">
            WELCOME TO
          </div>
          <div className="h-[52%] px-[3.5%] pt-[1%]">
            <div className="grid h-full grid-cols-1 grid-rows-[58%_42%] items-center">
              <div className="row-start-1 flex min-w-0 items-center justify-center px-[2%]">
                <div className="led-text-glow font-led w-full whitespace-nowrap text-center text-[clamp(17px,3.1vh,34px)] font-black leading-none tracking-tight text-[#F7D117]">MONDAY CUP</div>
              </div>
              <div className="row-start-2 flex h-full items-center justify-center">
                <div className="led-text-glow font-led whitespace-nowrap text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none tracking-[0.11em] text-[#F7D117]">
                  GLOBAL PENALTY KICK TOURNAMENT
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeFooter() {
  return (
    <div className="relative z-10 flex justify-center pb-5 pt-2">
      <img src={ASSETS.myMundialLogo} alt="myMUNDIAL" className="h-8 w-auto object-contain opacity-90" draggable={false} />
    </div>
  );
}

function HomeLayout({ children, allTeamsUnlocked = false }) {
  return (
    <Shell>
      <div className="home-main-font relative flex h-[100dvh] flex-col overflow-hidden bg-[#0d6c3d] text-[#072D1D]">
        <ScoreboardPlaceholder allTeamsUnlocked={allTeamsUnlocked} />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <HomePitchBackdrop />
          <FloatingHomeLogo />
          <div className="relative z-10 flex h-full flex-col px-5 pb-0" style={{ paddingTop: HOME_MENU_TOP_OFFSET }}>
            <div className="min-h-0 flex-1 overflow-y-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-h-full flex-col justify-start">
                {children}
              </div>
            </div>
            <HomeFooter />
          </div>
        </main>
      </div>
    </Shell>
  );
}

function ActionButton({ children, eyebrow, onClick, variant = "light", disabled = false, type = "button", size = "normal" }) {
  const styles = variant === "yellow"
    ? "border-[#F7D117]/75 bg-[#F7D117] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)]"
    : variant === "green"
      ? "border-[#F5F0E6]/20 bg-[#0B5F35] text-[#F5F0E6]"
      : variant === "account"
        ? "border-[#F5F0E6]/18 bg-[#F5F0E6]/18 text-[#F5F0E6]"
        : "border-[#D4AF37]/50 bg-[#F5F0E6] text-[#0B5F35]";

  const heightClass = size === "hero" ? "min-h-[62px] py-3" : "h-[44px]";
  const textClass = size === "hero" ? "text-[clamp(20px,5.4vw,30px)] tracking-[0.075em]" : "text-[clamp(12px,3.45vw,20px)] tracking-[0.055em]";

  return <button type={type} onClick={onClick} disabled={disabled} className={`flex ${heightClass} w-full items-center justify-center rounded-[1rem] border px-4 text-center transition ${styles} ${disabled ? "opacity-70" : "active:scale-[0.99]"}`}>
    {eyebrow && <span className="sr-only">{eyebrow}</span>}
    <div className={`home-copy-bold w-full truncate whitespace-nowrap ${textClass} uppercase leading-none`}>{children}</div>
  </button>;
}

function SavedCampaignCard({ summary, onContinue }) {
  if (!summary) return null;
  return <button onClick={onContinue} className="w-full rounded-[1.35rem] border border-[#D4AF37]/55 bg-[#F5F0E6] p-4 text-left text-[#0B5F35] shadow-inner">
    <div className="text-[8px] font-black uppercase tracking-[0.24em] text-[#0B5F35]/45">CONTINUE CAMPAIGN</div>
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[21px] font-black uppercase leading-none tracking-[-0.02em]">{summary.team}</div>
        <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#0B5F35]/50">{summary.matchStage} · v {summary.opponent}</div>
      </div>
      <div className="shrink-0 rounded-full bg-[#0B5F35] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#F5F0E6]">PLAY</div>
    </div>
  </button>;
}

function HomeMenuShell({ children, className = "", onBack }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.65rem] border border-[#F5F1E8]/14 bg-[#0B5F35]/88 text-[#F5F1E8] shadow-[0_8px_18px_rgba(0,0,0,0.16),inset_0_-2px_6px_rgba(0,0,0,0.06)] ${className}`}>
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
      <div className="px-4 py-2 shadow-[inset_0_6px_14px_rgba(255,255,255,0.025)]">
        {children}
      </div>
    </div>
  );
}

function FloatingHomeLogo() {
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[20] flex justify-center" style={{ top: `calc(${HOME_LOGO_TOP_PADDING} + ${HOME_LOGO_TOP_RATIO * 100}%)` }} aria-hidden="true">
      <div className="relative flex w-[40vw] max-w-[420px] min-w-[220px] items-start justify-center" style={{ height: HOME_LOGO_HEIGHT }}>
        <div className="absolute inset-x-10 bottom-2 h-[42%] rounded-full bg-[#F7D117]/28 blur-3xl" />
        <div className="absolute inset-x-14 bottom-3 h-[36%] rounded-full bg-[#F5F1E8]/24 blur-2xl" />
        <img src={ASSETS.mondayLogo} alt="Monday Cup" className="relative z-10 h-full w-auto object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.44)]" draggable={false} />
      </div>
    </div>
  );
}

function AuthInput({ icon, type = "text", placeholder, value, onChange }) {
  return (
    <label className="block text-left">
      <span className="sr-only">{placeholder}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#0B5F35]/82">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="home-copy-regular h-9 w-full rounded-[0.85rem] border border-[#F5F0E6]/18 bg-[#F5F0E6]/94 py-0 pl-11 pr-4 text-[15px] uppercase tracking-[0.055em] text-[#0B5F35] outline-none placeholder:text-[#0B5F35]/34 focus:border-[#F7D117]"
        />
      </div>
    </label>
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

function AuthPanel({ mode, setMode, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const isRegister = mode === "register";

  const resetMessages = () => {
    setAuthError("");
    setAuthSuccess("");
  };

  const switchMode = (nextMode) => {
    resetMessages();
    setMode(nextMode);
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

      await setDoc(doc(db, "users", credential.user.uid), {
        username: trimmedUsername,
        email: trimmedEmail,
        favouriteTeam: "",
        emailOptIn,
        worldCupsWon: 0,
        goalsScored: 0,
        matchesWon: 0,
        bestCampaignPoints: 0,
        leaderboardRank: null,
        unlockedTeams: false,
        upgrades: {
          power: 0,
          accuracy: 0,
          goalkeeper: 0,
          brownEnvelope: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAuthSuccess("Account created welcome to the Clubhouse");
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
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
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setAuthError("Please enter your email address first");
      setAuthSuccess("");
      return;
    }

    try {
      setAuthLoading(true);
      resetMessages();
      await sendPasswordResetEmail(auth, trimmedEmail);
      setAuthSuccess("Password reset link sent");
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  if (forgotPassword) {
    return <div className="space-y-3">
      <HomeMenuShell onBack={() => { resetMessages(); setForgotPassword(false); }}>
        <div className="flex min-h-[30px] items-center justify-center text-center">
          <div className={MENU_TITLE_CLASS}>RESET PASSWORD</div>
        </div>
        <form className="mt-3 space-y-2" onSubmit={handleForgotPassword}>
          <AuthInput icon={<AtIcon className="h-5 w-5" />} placeholder="Confirm email address" type="email" value={email} onChange={(event) => { resetMessages(); setEmail(event.target.value); }} />
          {authError && <div className="home-copy-regular rounded-[0.8rem] bg-red-500/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-red-100">{authError}</div>}
          {authSuccess && <div className="home-copy-regular rounded-[0.8rem] bg-[#B7FF3C]/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-[#B7FF3C]">{authSuccess}</div>}
          <ActionButton type="submit" variant="yellow">{authLoading ? "SENDING..." : "SEND RESET LINK"}</ActionButton>
        </form>
      </HomeMenuShell>
    </div>;
  }

  return <div className="space-y-3">
    <HomeMenuShell onBack={onBack}>
      <div className="flex min-h-[30px] items-center justify-center text-center">
        <div className={MENU_TITLE_CLASS}>CLUBHOUSE</div>
      </div>
      <div className="mt-2 grid grid-cols-2 rounded-[0.75rem] border border-[#F5F1E8]/20 bg-[#072D1D]/42 p-0.5 shadow-inner">
        <button type="button" onClick={() => switchMode("signin")} className={`home-copy-bold h-6 rounded-[0.55rem] text-[14px] uppercase tracking-[0.05em] transition ${!isRegister ? "bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.24)]" : "text-[#F5F1E8]/62"}`}>SIGN IN</button>
        <button type="button" onClick={() => switchMode("register")} className={`home-copy-bold h-6 rounded-[0.55rem] text-[14px] uppercase tracking-[0.05em] transition ${isRegister ? "bg-[#F7D117] text-[#072D1D] shadow-[0_0_12px_rgba(247,209,23,0.24)]" : "text-[#F5F1E8]/62"}`}>SIGN UP</button>
      </div>
      <form className="mt-2 space-y-1.5" onSubmit={handleSubmit}>
        {isRegister && <AuthInput icon={<StarIcon className="h-5 w-5" />} placeholder="Username" value={username} onChange={(event) => { resetMessages(); setUsername(event.target.value); }} />}
        <AuthInput icon={<AtIcon className="h-5 w-5" />} placeholder="Email address" type="email" value={email} onChange={(event) => { resetMessages(); setEmail(event.target.value); }} />
        <AuthInput icon={<PadlockIcon className="h-5 w-5" />} placeholder="Password" type="password" value={password} onChange={(event) => { resetMessages(); setPassword(event.target.value); }} />
        <ActionButton type="submit" variant="yellow">{authError || authSuccess || (authLoading ? "LOADING..." : isRegister ? "REGISTER" : "SIGN IN")}</ActionButton>
        {isRegister && (
          <label className="home-copy-bold flex items-center justify-center gap-2 bg-transparent py-0.5 text-center text-[11px] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]">
            <input type="checkbox" checked={emailOptIn} onChange={(event) => setEmailOptIn(event.target.checked)} className="h-4 w-4 shrink-0 accent-[#F7D117]" />
            <span>Receive email communications</span>
          </label>
        )}
        {!isRegister && (
          <button type="button" onClick={() => { resetMessages(); setForgotPassword(true); }} className="home-copy-bold mx-auto mt-2 block text-[11px] uppercase tracking-[0.16em] text-[#F5F1E8] underline-offset-4 active:scale-[0.98]">
            FORGOT PASSWORD?
          </button>
        )}
      </form>
    </HomeMenuShell>
  </div>;
}

function LandingPanel({ onPlayGuest }) {
  const [authMode, setAuthMode] = useState(null);
  if (authMode) return <AuthPanel mode={authMode} setMode={setAuthMode} onBack={() => setAuthMode(null)} />;

  return <div className="space-y-3">
    <HomeMenuShell>
      <div className="space-y-2.5">
        <ActionButton onClick={onPlayGuest} variant="yellow" size="hero">PLAY NOW</ActionButton>
        <ActionButton onClick={() => setAuthMode("signin")} variant="yellow" size="hero">CLUBHOUSE</ActionButton>
      </div>
    </HomeMenuShell>
  </div>;
}

function getTeamGroup(teamName) {
  return GROUP_LETTERS.find((letter) => GROUPS[letter].includes(teamName)) || "A";
}

function HostPanel({ onSelectGroup, onSelectTeam, onBack }) {
  const hostLabels = { Canada: "CAN", Mexico: "MEX", "United States": "USA" };

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
            className="relative flex h-[50px] items-center justify-center overflow-hidden rounded-[1rem] border border-[#F5F1E8]/22 px-3 shadow-[0_0_8px_rgba(245,241,232,0.06),inset_0_2px_8px_rgba(255,255,255,0.10)] active:scale-[0.99]"
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
    <button onClick={() => onSelectGroup("A")} className="relative mt-3 flex h-[56px] w-full items-center justify-center rounded-[1.05rem] border-2 border-[#F7D117]/85 bg-[#F7D117] px-5 text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.18),inset_0_2px_8px_rgba(255,255,255,0.08)] active:scale-[0.99]">
      <PadlockIcon className="absolute left-5 h-7 w-7" />
      <div className="home-copy-bold min-w-0 truncate text-center text-[clamp(13px,3.5vw,17px)] uppercase leading-none tracking-[0.075em]">ALL TEAMS</div>
      <div className="home-copy-bold absolute right-5 text-right text-[19px] uppercase tracking-[0.06em]">£0.99</div>
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
        return <button key={name} onClick={() => onSelectTeam(name)} className="grid h-[42px] grid-cols-[40px_minmax(0,1fr)_32px] items-center gap-2 rounded-[1.15rem] border border-[#F5F1E8]/18 px-4 text-left shadow-[0_0_8px_rgba(245,241,232,0.05),inset_0_2px_8px_rgba(255,255,255,0.08)] active:scale-[0.99]" style={{ backgroundColor: theme.bg, color: theme.text }}><span className="flex h-6 w-8 items-center justify-center overflow-hidden rounded-[0.25rem] border border-[#F5F1E8]/24 bg-[#F5F1E8]/90 shadow-[0_2px_5px_rgba(0,0,0,0.18)]"><Flag team={name} className="h-full w-full object-contain" /></span><span className="home-copy-bold truncate text-center text-[19px] uppercase tracking-[0.06em]">{name}</span><span className="home-copy-bold text-right text-[12px] tabular-nums tracking-[0.08em] opacity-65">#{TEAM_RANK[name]}</span></button>;
      })}
    </div>
  </HomeMenuShell>;
}

export function HomeScreen({ onSelectGroup, onSelectTeam, allTeamsUnlocked = false }) {
  const [homeMode, setHomeMode] = useState("landing");
  if (homeMode === "hosts") return <HomeLayout allTeamsUnlocked={allTeamsUnlocked}><HostPanel onBack={() => setHomeMode("landing")} onSelectGroup={onSelectGroup} onSelectTeam={onSelectTeam} /></HomeLayout>;
  return <HomeLayout allTeamsUnlocked={allTeamsUnlocked}><LandingPanel onPlayGuest={() => setHomeMode("hosts")} /></HomeLayout>;
}
export function HostSelectScreen(props) { return <HomeLayout allTeamsUnlocked={props.allTeamsUnlocked}><HostPanel {...props} /></HomeLayout>; }
export function TeamSelectScreen({ selectedGroup, onSelectGroup, onSelectTeam, onBack, allTeamsUnlocked = false }) { return <HomeLayout allTeamsUnlocked={allTeamsUnlocked}><TeamPanel group={selectedGroup} onBack={onBack} onSelectGroup={onSelectGroup} onSelectTeam={onSelectTeam} /></HomeLayout>; }
